import "@efffrida/polyfills";
import "frida-il2cpp-bridge";

import { RpcSerialization, RpcServer } from "@effect/rpc";
import { Assembly, Class, Extensions, FridaIl2cppBridge } from "@efffrida/il2cpp-bridge";
import { FridaRuntime } from "@efffrida/platform";
import { FridaRpcServer } from "@efffrida/rpc/frida";
import { Array, Cause, Effect, Function, Layer, Option, pipe, Record, Schedule, Schema, Tuple } from "effect";

import { GameState, Rpcs, TowerCredentials } from "../shared/Rpcs.ts";

/** @internal */
export const liftNimblebitDSO = (object: Il2Cpp.Object): Extensions.Dictionary<Il2Cpp.String, Il2Cpp.Object> => {
    const dictionary = Extensions.Dictionary.lift<Il2Cpp.String, Il2Cpp.Object>(object);
    dictionary.class.generics[0] = Il2Cpp.corlib.class("System.String");
    dictionary.class.generics[1] = Il2Cpp.corlib.class("System.Object");
    return dictionary;
};

/** @internal */
export const readString = (object: Il2Cpp.Field.Type): Option.Option<string> => {
    if (object instanceof Il2Cpp.String) {
        return Option.fromNullable(object.isNull() ? null : object.content);
    } else {
        return Option.some(object.toString());
    }
};

/** @internal */
export const objectReadAllFields = (object: Il2Cpp.Object): Record<string, string> =>
    pipe(
        object.class.fields,
        Array.filter((field) => !field.isStatic),
        Array.filter((field) => !field.name.startsWith("_")),
        Array.filterMap((classField) => {
            const objectField = object.field(classField.name);
            return Option.product(Option.some(objectField.name), readString(objectField.value));
        }),
        Record.fromEntries
    );

/** @internal */
export const readEnum = (enumClass: Il2Cpp.Class): Record<string, string> =>
    pipe(
        enumClass.fields,
        Array.filter((field) => field.type.class === enumClass),
        Array.map((field) => Tuple.make(field.name, field.value.toString())),
        Record.fromEntries
    );

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
            instanceFieldName: string | undefined = "instance",
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
                        !field.handle.equals(ptr(0x0)) &&
                        !field.value.handle.equals(ptr(0x0)),
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

        // Loading necessary classes
        yield* waitForInstance("VGame");
        yield* waitForInstance("VPlayer");

        // Global assemblies
        const CSharpAssembly = yield* assemblyCached("Assembly-CSharp");
        const CoreEngineAssembly = yield* assemblyCached("UnityEngine.CoreModule");

        // Version implementation
        const version = Effect.fnUntraced(function* () {
            const VersionUtilsClass = yield* tryClassCached(CSharpAssembly.image, "VersionUtils");
            const VersionStringMethod = yield* tryMethodCached<Il2Cpp.Array<number>>(
                VersionUtilsClass,
                "get_parsedVersion"
            );

            const versionParts = Array.fromIterable(VersionStringMethod.invoke());
            const decode = Schema.decodeUnknown(Schema.Tuple(Schema.Int, Schema.Int, Schema.Int));
            return yield* Effect.map(decode(versionParts), ([major, minor, patch]) => `${major}.${minor}.${patch}`);
        }, Effect.orDie);

        // SetFps implementation
        const setFps = Effect.fnUntraced(function* (fps: number) {
            const ApplicationClass = yield* tryClassCached(CoreEngineAssembly.image, "UnityEngine.Application");
            const setTargetFpsMethod = yield* tryMethodCached<void>(ApplicationClass, "set_targetFrameRate", 1);
            return setTargetFpsMethod.invoke(fps);
        }, Effect.orDie);

        // GetTowerCredentials implementation
        const getTowerCredentials = Effect.fnUntraced(function* () {
            const NBSyncClass = yield* tryClassCached(CSharpAssembly.image, "NBSync");
            const PlayerIdField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerID");
            const PlayerRegistered = yield* tryMethodCached<boolean>(NBSyncClass, "get_playerRegistered");
            const PlayerEmailField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerEmail");
            const PlayerAuthKeyField = yield* tryMethodCached<Il2Cpp.String>(NBSyncClass, "get_playerSalt");

            const playerId = PlayerIdField.invoke().content;
            const playerAuthKey = PlayerAuthKeyField.invoke().content;
            const playerEmail = PlayerRegistered.invoke()
                ? Option.some(PlayerEmailField.invoke().content)
                : Option.none();

            return yield* Schema.decodeUnknown(TowerCredentials)({
                playerId,
                playerAuthKey,
                playerEmail,
            });
        }, Effect.orDie);

        // SetTowerCredentials implementation
        const setTowerCredentials = Effect.fnUntraced(function* (payload: Schema.Schema.Type<typeof TowerCredentials>) {
            const NBSyncClass = yield* tryClassCached(CSharpAssembly.image, "NBSync");
            const SwitchRegisteredPlaterMethod = yield* tryMethodCached<void>(NBSyncClass, "switchRegisteredPlater", 4);

            SwitchRegisteredPlaterMethod.invoke(
                Il2Cpp.string(payload.playerId),
                Il2Cpp.string(payload.playerAuthKey),
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
            yield* waitForInstance("VFloorData");
            const FloorTypeClass = yield* tryClassCached(CSharpAssembly.image, "FloorType");
            const VFloorDataClass = yield* tryClassCached(CSharpAssembly.image, "VFloorData");
            const FloorsField = yield* tryFieldCached<Il2Cpp.Object>(VFloorDataClass, "info");

            const types = readEnum(FloorTypeClass);
            const floors = pipe(
                FloorsField.value,
                Extensions.Dictionary.lift<number, Il2Cpp.Object>,
                (floorInfo) => floorInfo.entries,
                Array.filter(([floorIndex]) => floorIndex >= 0),
                Array.map(([floorIndex, floorObject]) => {
                    const index = floorIndex.toString();
                    const floor = liftNimblebitDSO(floorObject);
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
            yield* waitForInstance("VElevatorData");
            const VElevatorDataClass = yield* tryClassCached(CSharpAssembly.image, "VElevatorData");
            const NumElevatorsField = yield* tryFieldCached<number>(VElevatorDataClass, "NUM_ELEVATORS");
            const ElevatorsField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.Object>>(VElevatorDataClass, "info");

            const numElevators = NumElevatorsField.value;
            const elevators = pipe(
                ElevatorsField.value,
                Array.fromIterable,
                Array.map((elevatorObject) => {
                    const elevator = liftNimblebitDSO(elevatorObject);
                    return elevator.get(Il2Cpp.string("name")).toString();
                })
            );

            if (elevators.length !== numElevators) {
                return yield* Effect.dieMessage(
                    `Expected to read ${numElevators} elevators, but only read ${elevators.length} instead`
                );
            }

            return elevators;
        }, Effect.orDie);

        // Get all roofs implementation
        const getAllRoofs = Effect.fnUntraced(function* () {
            yield* waitForInstance("VRoofData");
            const VRoofDataClass = yield* tryClassCached(CSharpAssembly.image, "VRoofData");
            const NumRoofsField = yield* tryFieldCached<number>(VRoofDataClass, "NUM_ROOFS");
            const RoofsField = yield* tryFieldCached<Il2Cpp.Array<Il2Cpp.Object>>(VRoofDataClass, "info");

            const numRoofs = NumRoofsField.value;
            const roofs = pipe(
                RoofsField.value,
                Array.fromIterable,
                Array.map((roofObject) => {
                    const roof = liftNimblebitDSO(roofObject);
                    return roof.get(Il2Cpp.string("name")).toString();
                })
            );

            if (roofs.length !== numRoofs) {
                return yield* Effect.dieMessage(
                    `Expected to read ${numRoofs} roofs, but only read ${roofs.length} instead`
                );
            }

            return roofs;
        }, Effect.orDie);

        // Get all costumes implementation
        const getAllCostumes = Effect.fnUntraced(function* () {
            yield* waitForInstance("VCostumeTable", "_instance");
            const VCostumeTableClass = yield* tryClassCached(CSharpAssembly.image, "VCostumeTable");
            const VCostumeTableInstanceField = yield* tryFieldCached<Il2Cpp.Object>(VCostumeTableClass, "_instance");
            const CostumesField = VCostumeTableInstanceField.value.field<Il2Cpp.Object>("costumes");

            const costumes = pipe(
                CostumesField.value,
                liftNimblebitDSO,
                (costumeDict) => costumeDict.toRecord(),
                Record.map(objectReadAllFields)
            );

            return costumes;
        }, Effect.orDie);

        // Get all bitbook posts implementation
        const getAllBitbookPosts = Effect.fnUntraced(function* () {
            yield* waitForInstance("VBitbookPostData");
            const BBEventTypeClass = yield* tryClassCached(CSharpAssembly.image, "BBEventType");
            const PostMediaTypeClass = yield* tryClassCached(CSharpAssembly.image, "PostMediaType");
            const VBitbookPostDataClass = yield* tryClassCached(CSharpAssembly.image, "VBitbookPostData");
            const PostsField = yield* tryFieldCached<Il2Cpp.Object>(VBitbookPostDataClass, "posts");

            const eventTypes = readEnum(BBEventTypeClass);
            const mediaTypes = readEnum(PostMediaTypeClass);
            const posts = pipe(
                PostsField.value,
                Extensions.Dictionary.lift<number, Il2Cpp.Object>,
                (postDict) => postDict.values,
                Array.map((postObject) => liftNimblebitDSO(postObject).toRecord()),
                Array.map(Record.map((object) => object.toString()))
            );

            return { eventTypes, mediaTypes, posts };
        }, Effect.orDie);

        // Get all bitizen attributes implementation
        const getAllBitizenData = Effect.fnUntraced(function* () {
            const VBitizenClass = yield* tryClassCached(CSharpAssembly.image, "VBitizen");
            const LocalizationManager = yield* tryClassCached(CSharpAssembly.image, "LocalizationManager");
            const SkinColorsField = yield* tryFieldCached<Il2Cpp.Object>(VBitizenClass, "skinColors");
            const HairColorsField = yield* tryFieldCached<Il2Cpp.Object>(VBitizenClass, "hairColors");
            const NumHairAccessoriesField = yield* tryFieldCached<number>(VBitizenClass, "numHairAcc");
            const NumGlassesField = yield* tryFieldCached<number>(VBitizenClass, "numGlasses");
            const NumFemaleHatsField = yield* tryFieldCached<number>(VBitizenClass, "numFHats");
            const NumMaleHatsField = yield* tryFieldCached<number>(VBitizenClass, "numMHats");
            const NumBiHatsField = yield* tryFieldCached<number>(VBitizenClass, "numBHats");

            type StringArray = Il2Cpp.Array<Il2Cpp.String>;
            const readStringArray = Function.flow(Array.fromIterable<Il2Cpp.Field.Type>, Array.filterMap(readString));
            const readObjectList = Function.compose(Extensions.List.lift<Il2Cpp.Object>, readStringArray);

            const LocalizationManagerInstance = Il2Cpp.gc.choose(LocalizationManager)[0];
            const MaleNamesField = LocalizationManagerInstance.field<StringArray>("maleNames");
            const FemaleNamesField = LocalizationManagerInstance.field<StringArray>("femaleNames");
            const MaleLastNamesField = LocalizationManagerInstance.field<StringArray>("lastMaleNames");
            const FemaleLastNamesField = LocalizationManagerInstance.field<StringArray>("lastFemaleNames");

            return {
                numberHairAccessories: NumHairAccessoriesField.value,
                numberGlasses: NumGlassesField.value,
                numberFemaleHats: NumFemaleHatsField.value,
                numberMaleHats: NumMaleHatsField.value,
                numberBiHats: NumBiHatsField.value,
                maleNames: readStringArray(MaleNamesField.value),
                femaleNames: readStringArray(FemaleNamesField.value),
                maleLastNames: readStringArray(MaleLastNamesField.value),
                femaleLastNames: readStringArray(FemaleLastNamesField.value),
                skinColors: readObjectList(SkinColorsField.value),
                hairColors: readObjectList(HairColorsField.value),
            };
        }, Effect.orDie);

        // Get all missions implementation
        const getAllMissions = Effect.fnUntraced(function* () {
            yield* waitForInstance("VMissionData");
            const MissionTypeClass = yield* tryClassCached(CSharpAssembly.image, "MissionType");
            const VMissionDataClass = yield* tryClassCached(CSharpAssembly.image, "VMissionData");
            const MissionsField = yield* tryFieldCached<Il2Cpp.Object>(VMissionDataClass, "missions");
            const TipMissionsField = yield* tryFieldCached<Il2Cpp.Object>(VMissionDataClass, "tipMissions");
            const TutorialMissionsField = yield* tryFieldCached<Il2Cpp.Object>(VMissionDataClass, "tutMissions");
            const values = Function.compose(Extensions.Dictionary.lift<number, Il2Cpp.Object>, (dict) => dict.values);

            const types = readEnum(MissionTypeClass);
            const missions = Array.map(values(MissionsField.value), objectReadAllFields);
            const tipMissions = Array.map(values(TipMissionsField.value), objectReadAllFields);
            const tutorialMissions = Array.map(values(TutorialMissionsField.value), objectReadAllFields);
            return { types, missions, tipMissions, tutorialMissions };
        }, Effect.orDie);

        // Get all pets implementation
        const getAllPets = Effect.fnUntraced(function* () {
            yield* waitForInstance("VPetTable", "_instance");
            const VPetTableClass = yield* tryClassCached(CSharpAssembly.image, "VPetTable");
            const VPetTableInstanceField = yield* tryFieldCached<Il2Cpp.Object>(VPetTableClass, "_instance");
            const VPetTableDefinitionsField = VPetTableInstanceField.value.field<Il2Cpp.Object>("definitions");

            const readPetObject = Function.flow(
                liftNimblebitDSO,
                (dict) => dict.toRecord([Il2Cpp.string("VIP")]),
                Record.map((value) => value.toString()),
                Record.map((boolean) => (boolean.toLowerCase() === "true" ? true : false))
            );

            const pets = pipe(
                VPetTableDefinitionsField.value,
                liftNimblebitDSO,
                (petDict) => petDict.toRecord(),
                Record.map(readPetObject)
            );

            return pets;
        }, Effect.orDie);

        return {
            Version: version,
            SetFps: setFps,
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
