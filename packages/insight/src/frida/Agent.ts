import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Assembly, Class, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { FridaRuntime } from "@efffrida/platform";
import { FridaRpcServer } from "@efffrida/rpc/frida";
import { Array, Cause, Effect, Layer, Option, pipe, Record, Schedule, Schema, Tuple } from "effect";

import { GameState, Rpcs, type TowerCredentials } from "../shared/Rpcs.ts";
import { Dictionary, List } from "./Wrappers.ts";

const RpcsLive = Rpcs.toLayer(
    Effect.gen(function* () {
        // Caches
        const assemblyCached = yield* Assembly.assemblyCached;
        const tryClassCached = yield* Class.tryClassCached;
        const tryFieldCached = yield* Class.tryFieldCached;
        const tryMethodCached = yield* Class.tryMethodCached;

        // Helper to wait for instance fields
        const waitForInstance = <R = never>(
            className: string,
            instanceFieldName: string = "instance",
            policy: Schedule.Schedule<unknown, Cause.NoSuchElementException, R> | undefined = Schedule.addDelay(
                Schedule.recurs(3),
                () => "2 seconds"
            )
        ): Effect.Effect<void, Cause.NoSuchElementException, R> =>
            pipe(
                assemblyCached("Assembly-CSharp"),
                Effect.map((assembly) => assembly.image),
                Effect.flatMap(Class.tryClass(className)),
                Effect.flatMap(Class.tryField(instanceFieldName)<Il2Cpp.Object>),
                Effect.filterOrFail(
                    (field) =>
                        !field.isNull() &&
                        !field.value.isNull() &&
                        !field.handle.equals(0x0) &&
                        !field.value.handle.equals(0x0),
                    () => new Cause.NoSuchElementException(`${className}.${instanceFieldName} is null`)
                ),
                Effect.tap((field) =>
                    Effect.try({
                        try: () => field.value.class.name,
                        catch: () => new Cause.NoSuchElementException(`${className} class is not yet available`),
                    })
                ),
                Effect.retry(policy)
            );

        // Loading (will get access violations if you don't wait for these)
        yield* waitForInstance("VGame");
        yield* waitForInstance("VPlayer");
        yield* waitForInstance("VPetTable", "_instance");
        yield* waitForInstance("VCostumeTable", "_instance");

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");

        // Version implementation
        const version = Effect.fnUntraced(function* () {
            const VersionUtilsClass = yield* tryClassCached(CSharpAssembly.image, "VersionUtils");
            const VersionStringMethod = yield* tryMethodCached<Il2Cpp.Array<number>>(
                VersionUtilsClass,
                "get_parsedVersion"
            );

            const decode = Schema.decodeUnknown(Schema.Tuple(Schema.Int, Schema.Int, Schema.Int));
            const versionParts = Array.fromIterable(VersionStringMethod.invoke());
            return yield* Effect.map(decode(versionParts), ([major, minor, patch]) => `${major}.${minor}.${patch}`);
        }, Effect.orDie);

        // GetTowerCredentials implementation
        const getTowerCredentials = Effect.fnUntraced(function* () {
            const NBSyncClass = yield* tryClassCached(CSharpAssembly.image, "NBSync");
            const PlayerIdField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerID");
            const PlayerRegistered = yield* tryMethodCached<boolean>(NBSyncClass, "get_playerRegistered");
            const PlayerEmailField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerEmail");
            const PlayerAuthKeyField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerSalt");

            return {
                playerId: PlayerIdField.invoke().content!,
                playerSalt: PlayerAuthKeyField.invoke().content!,
                playerEmail: PlayerRegistered.invoke()
                    ? Option.some(PlayerEmailField.invoke().content!)
                    : Option.none(),
            };
        }, Effect.orDie);

        // SetTowerCredentials implementation
        const setTowerCredentials = Effect.fnUntraced(function* (payload: TowerCredentials) {
            const NBSyncClass = yield* tryClassCached(CSharpAssembly.image, "NBSync");
            const SwitchRegisteredPlaterMethod = yield* tryMethodCached<void>(NBSyncClass, "switchRegisteredPlater", 4);

            SwitchRegisteredPlaterMethod.invoke(
                Il2Cpp.string(payload.playerId),
                Il2Cpp.string(payload.playerSalt),
                Il2Cpp.string(Option.getOrNull(payload.playerEmail)),
                Option.isSome(payload.playerEmail)
            );

            return yield* getTowerCredentials();
        }, Effect.orDie);

        // GetGameState implementation
        const getGameState = Effect.fnUntraced(function* () {
            const VPlayerClass = yield* tryClassCached(CSharpAssembly.image, "VPlayer");
            const BuxMethod = yield* tryMethodCached<Il2Cpp.String>(VPlayerClass, "get_bux");
            const CoinsMethod = yield* tryMethodCached<Il2Cpp.String>(VPlayerClass, "get_coins");
            const GoldenTicketsMethod = yield* tryMethodCached<Il2Cpp.String>(VPlayerClass, "get_gold");
            const ElevatorSpeedMethod = yield* tryMethodCached<Il2Cpp.String>(VPlayerClass, "get_ElevatorSpeed");

            return yield* Schema.decodeUnknown(GameState)({
                bux: Number(BuxMethod.invoke().content),
                coins: Number(CoinsMethod.invoke().content),
                elevatorSpeed: Number(ElevatorSpeedMethod.invoke().content),
                goldenTickets: Number(GoldenTicketsMethod.invoke().content),
            });
        }, Effect.orDie);

        // Get all floors implementation
        const getAllFloors = Effect.fnUntraced(function* () {
            const FloorTypeClass = yield* tryClassCached(CSharpAssembly.image, "FloorType");
            const VFloorDataClass = yield* tryClassCached(CSharpAssembly.image, "VFloorData");
            const FloorsField = yield* tryFieldCached<Il2Cpp.Object>(VFloorDataClass, "info");

            const types = pipe(
                FloorTypeClass.fields,
                Array.filter((field) => field.type.class === FloorTypeClass),
                Array.map((field) => Tuple.make(field.name, field.value.toString())),
                Record.fromEntries
            );

            const floors = pipe(
                FloorsField.value,
                Dictionary.lift<number, Il2Cpp.Object>,
                (floorInfo) => floorInfo.entries,
                Array.filter(([floorIndex]) => floorIndex >= 0),
                Array.map(([floorIndex, floorObject]) => {
                    const index = floorIndex.toString();
                    const floor = Dictionary.liftNimblebitDSO(floorObject);
                    const name = floor.get(Il2Cpp.string("name")).toString();
                    const type = floor.get(Il2Cpp.string("type")).toString();
                    return Tuple.make(name, { index, type });
                }),
                Record.fromEntries
            );

            return { floors, types };
        }, Effect.orDie);

        // Get all elevators implementation
        const getAllElevators = Effect.fnUntraced(function* () {
            const VElevatorDataClass = yield* tryClassCached(CSharpAssembly.image, "VElevatorData");
            const NumElevatorsField = yield* tryFieldCached<number>(VElevatorDataClass, "NUM_ELEVATORS");
            const ElevatorsField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.Object>>(VElevatorDataClass, "info");

            const numElevators = NumElevatorsField.value;
            const elevators = pipe(
                ElevatorsField.value,
                Array.fromIterable,
                Array.map((elevatorObject, elevatorIndex) => {
                    const index = elevatorIndex.toString();
                    const elevator = Dictionary.liftNimblebitDSO(elevatorObject);
                    const name = elevator.get(Il2Cpp.string("name")).toString();
                    return Tuple.make(name, { index });
                }),
                Record.fromEntries
            );

            if (Record.keys(elevators).length !== numElevators) {
                return yield* Effect.dieMessage(
                    `Expected ${numElevators} elevators, but found ${Record.keys(elevators).length} instead`
                );
            }

            return elevators;
        }, Effect.orDie);

        // Get all roofs implementation
        const getAllRoofs = Effect.fnUntraced(function* () {
            const VRoofDataClass = yield* tryClassCached(CSharpAssembly.image, "VRoofData");
            const NumRoofsField = yield* tryFieldCached<number>(VRoofDataClass, "NUM_ROOFS");
            const RoofsField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.Object>>(VRoofDataClass, "info");

            const numRoofs = NumRoofsField.value;
            const roofs = pipe(
                RoofsField.value,
                Array.fromIterable,
                Array.map((roofObject, roofIndex) => {
                    const index = roofIndex.toString();
                    const roof = Dictionary.liftNimblebitDSO(roofObject);
                    const name = roof.get(Il2Cpp.string("name")).toString();
                    return Tuple.make(name, { index });
                }),
                Record.fromEntries
            );

            if (Record.keys(roofs).length !== numRoofs) {
                return yield* Effect.dieMessage(
                    `Expected ${numRoofs} roofs, but found ${Record.keys(roofs).length} instead`
                );
            }

            return roofs;
        }, Effect.orDie);

        // Get all costumes implementation
        const getAllCostumes = Effect.fnUntraced(function* () {
            const VCostumeClass = yield* tryClassCached(CSharpAssembly.image, "VCostume");
            const VCostumeTableClass = yield* tryClassCached(CSharpAssembly.image, "VCostumeTable");
            const VCostumeTableInstanceField = yield* tryFieldCached<Il2Cpp.Object>(VCostumeTableClass, "_instance");
            const CostumesField = VCostumeTableInstanceField.value.field<Il2Cpp.Object>("costumes");

            const costumeFields = Array.map(VCostumeClass.fields, (field) => field.name);
            const readCostume = (costumeObject: Il2Cpp.Object): Record<string, string> =>
                pipe(
                    costumeFields,
                    Array.map((field) => {
                        const fieldValue = costumeObject.field(field).value.toString();
                        return Tuple.make(field, fieldValue);
                    }),
                    Record.fromEntries
                );

            const costumes = pipe(
                CostumesField.value,
                Dictionary.liftNimblebitDSO,
                (costumeInfo) => costumeInfo.entries,
                Array.map(Tuple.mapFirst((name) => name.content!)),
                Array.map(Tuple.mapSecond((costumeObject) => readCostume(costumeObject))),
                Record.fromEntries
            );

            return costumes;
        }, Effect.orDie);

        // Get all bitbook posts implementation
        const getAllBitbookPosts = Effect.fnUntraced(function* () {
            const BBEventTypeClass = yield* tryClassCached(CSharpAssembly.image, "BBEventType");
            const PostMediaTypeClass = yield* tryClassCached(CSharpAssembly.image, "PostMediaType");
            const VBitbookPostDataClass = yield* tryClassCached(CSharpAssembly.image, "VBitbookPostData");
            const PostsField = yield* tryFieldCached<Il2Cpp.Object>(VBitbookPostDataClass, "posts");

            const eventTypes = pipe(
                BBEventTypeClass.fields,
                Array.filter((field) => field.type.class === BBEventTypeClass),
                Array.map((field) => Tuple.make(field.name, field.value.toString())),
                Record.fromEntries
            );

            const mediaTypes = pipe(
                PostMediaTypeClass.fields,
                Array.filter((field) => field.type.class === PostMediaTypeClass),
                Array.map((field) => Tuple.make(field.name, field.value.toString())),
                Record.fromEntries
            );

            const readPost = (postObject: Il2Cpp.Object): Record<string, string> =>
                pipe(
                    postObject,
                    Dictionary.liftNimblebitDSO,
                    (postDict) => postDict.entries,
                    Array.map(Tuple.mapFirst((key) => key.toString())),
                    Array.map(Tuple.mapSecond((value) => value.toString())),
                    Record.fromEntries
                );

            const posts = pipe(
                PostsField.value,
                Dictionary.lift<number, Il2Cpp.Object>,
                (postsDict) => postsDict.entries,
                Array.map(([postId, postObject]) => {
                    const index = postId.toString();
                    return Tuple.make(index, readPost(postObject));
                }),
                Record.fromEntries
            );

            return { eventTypes, mediaTypes, posts };
        }, Effect.orDie);

        // Get all bitizen attributes implementation
        const getAllBitizenData = Effect.fnUntraced(function* () {
            const VBitizenClass = yield* tryClassCached(CSharpAssembly.image, "VBitizen");
            const LocalizationManagerClass = yield* tryClassCached(CSharpAssembly.image, "LocalizationManager");
            const SkinColorsField = yield* tryFieldCached<Il2Cpp.Object>(VBitizenClass, "skinColors");
            const HairColorsField = yield* tryFieldCached<Il2Cpp.Object>(VBitizenClass, "hairColors");
            const NumHairAccessoriesField = yield* tryFieldCached<number>(VBitizenClass, "numHairAcc");
            const NumGlassesField = yield* tryFieldCached<number>(VBitizenClass, "numGlasses");
            const NumFemaleHatsField = yield* tryFieldCached<number>(VBitizenClass, "numFHats");
            const NumMaleHatsField = yield* tryFieldCached<number>(VBitizenClass, "numMHats");
            const NumBiHatsField = yield* tryFieldCached<number>(VBitizenClass, "numBHats");

            const snapshot = Il2Cpp.MemorySnapshot.capture();
            const LocalizationManagerInstance = snapshot.objects.find(Il2Cpp.isExactly(LocalizationManagerClass));
            if (!LocalizationManagerInstance) {
                return yield* Effect.dieMessage("Could not find LocalizationManager instance");
            }

            const MaleNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(
                LocalizationManagerClass,
                "maleNames"
            );
            const FemaleNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(
                LocalizationManagerClass,
                "femaleNames"
            );
            const MaleLastNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(
                LocalizationManagerClass,
                "lastMaleNames"
            );
            const FemaleLastNamesField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.String>>(
                LocalizationManagerClass,
                "lastFemaleNames"
            );

            const maleNames = pipe(
                MaleNamesField.value,
                Array.fromIterable,
                Array.map((name) => name.content!)
            );

            const femaleNames = pipe(
                FemaleNamesField.value,
                Array.fromIterable,
                Array.map((name) => name.content!)
            );

            const maleLastNames = pipe(
                MaleLastNamesField.value,
                Array.fromIterable,
                Array.map((name) => name.content!)
            );

            const femaleLastNames = pipe(
                FemaleLastNamesField.value,
                Array.fromIterable,
                Array.map((name) => name.content!)
            );

            const skinColors = pipe(
                SkinColorsField.value,
                List.lift<Il2Cpp.Object>,
                Array.fromIterable,
                Array.map((color) => color.toString())
            );

            const hairColors = pipe(
                HairColorsField.value,
                List.lift<Il2Cpp.Object>,
                Array.fromIterable,
                Array.map((color) => color.toString())
            );

            return {
                numberHairAccessories: NumHairAccessoriesField.value,
                numberGlasses: NumGlassesField.value,
                numberFemaleHats: NumFemaleHatsField.value,
                numberMaleHats: NumMaleHatsField.value,
                numberBiHats: NumBiHatsField.value,
                maleNames,
                femaleNames,
                maleLastNames,
                femaleLastNames,
                skinColors,
                hairColors,
            };
        }, Effect.orDie);

        // Get all missions implementation
        const getAllMissions = Effect.fnUntraced(function* () {
            const VMissionClass = yield* tryClassCached(CSharpAssembly.image, "VMission");
            const MissionTypeClass = yield* tryClassCached(CSharpAssembly.image, "MissionType");
            const VMissionDataClass = yield* tryClassCached(CSharpAssembly.image, "VMissionData");

            const MissionsField = yield* tryFieldCached<Il2Cpp.Object>(VMissionDataClass, "missions");
            const TipMissionsField = yield* tryFieldCached<Il2Cpp.Object>(VMissionDataClass, "tipMissions");
            const TutorialMissionsField = yield* tryFieldCached<Il2Cpp.Object>(VMissionDataClass, "tutMissions");

            const missionFields = pipe(
                VMissionClass.fields,
                Array.filter((field) => !field.isStatic),
                Array.filter((field) => !field.name.startsWith("_")),
                Array.map((field) => field.name)
            );

            const readMission = (missionObject: Il2Cpp.Object): Record<string, string> =>
                pipe(
                    missionFields,
                    Array.map((field) => {
                        const fieldValue = missionObject.field(field).value.toString();
                        return Tuple.make(field, fieldValue);
                    }),
                    Record.fromEntries
                );

            const types = pipe(
                MissionTypeClass.fields,
                Array.filter((field) => field.type.class === MissionTypeClass),
                Array.map((field) => Tuple.make(field.name, field.value.toString())),
                Record.fromEntries
            );

            const tutorialMissions = pipe(
                TutorialMissionsField.value,
                Dictionary.lift<number, Il2Cpp.Object>,
                (missionsDict) => missionsDict.entries,
                Array.map(([missionId, missionObject]) => {
                    const index = missionId.toString();
                    return Tuple.make(index, readMission(missionObject));
                }),
                Record.fromEntries
            );

            const tipMissions = pipe(
                TipMissionsField.value,
                Dictionary.lift<number, Il2Cpp.Object>,
                (missionsDict) => missionsDict.entries,
                Array.map(([missionId, missionObject]) => {
                    const index = missionId.toString();
                    return Tuple.make(index, readMission(missionObject));
                }),
                Record.fromEntries
            );

            const missions = pipe(
                MissionsField.value,
                Dictionary.lift<number, Il2Cpp.Object>,
                (missionsDict) => missionsDict.entries,
                Array.map(([missionId, missionObject]) => {
                    const index = missionId.toString();
                    return Tuple.make(index, readMission(missionObject));
                }),
                Record.fromEntries
            );

            return { types, tutorialMissions, tipMissions, missions };
        }, Effect.orDie);

        // Get all pets implementation
        const getAllPets = Effect.fnUntraced(function* () {
            const VPetTableClass = yield* tryClassCached(CSharpAssembly.image, "VPetTable");
            const VPetTableInstanceField = yield* tryFieldCached<Il2Cpp.Object>(VPetTableClass, "_instance");
            const VPetTableDefinitionsField = VPetTableInstanceField.value.field<Il2Cpp.Object>("definitions");

            const pets = pipe(
                VPetTableDefinitionsField.value,
                Dictionary.liftNimblebitDSO,
                (petDict) => petDict.entries,
                Array.map(([petName, petObject]) => {
                    const name = petName.content!;
                    const pet = Dictionary.liftNimblebitDSO(petObject);
                    const vip = pet.containsKey(Il2Cpp.string("VIP"))
                        ? pet.get(Il2Cpp.string("VIP")).toString()
                        : "false";
                    return Tuple.make(name, { vip });
                }),
                Record.fromEntries
            );

            return pets;
        }, Effect.orDie);

        return {
            Version: version,
            GetTowerCredentials: getTowerCredentials,
            SetTowerCredentials: setTowerCredentials,
            GetGameState: getGameState,
            GetAllFloors: getAllFloors,
            GetAllElevators: getAllElevators,
            GetAllRoofs: getAllRoofs,
            GetAllCostumes: getAllCostumes,
            GetAllBitbookPosts: getAllBitbookPosts,
            GetAllBitizenData: getAllBitizenData,
            GetAllMissions: getAllMissions,
            GetAllPets: getAllPets,
        };
    }).pipe(FridaIl2cppBridge.il2cppPerformEffect)
);

const NdJsonSerialization = RpcSerialization.layerNdjson;
const FridaProtocol = Layer.provide(FridaRpcServer.layerProtocolFrida(), NdJsonSerialization);
const RpcLayer = RpcServer.layer(Rpcs).pipe(Layer.provide(RpcsLive));

const Main = RpcLayer.pipe(Layer.provide(FridaProtocol));
Layer.launch(Main).pipe(FridaRuntime.runMain);
