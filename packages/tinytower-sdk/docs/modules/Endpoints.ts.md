---
title: Endpoints.ts
nav_order: 1
parent: Modules
---

## Endpoints.ts overview

Since v1.0.0

---

## Exports Grouped by Category

- [Schemas](#schemas)
  - [PlayerMetaData](#playermetadata)

---

# Schemas

## PlayerMetaData

Player metadata associated with save data and snapshots.

**Signature**

```ts
declare const PlayerMetaData: Schema.encodeKeys<
  Schema.Struct<{
    readonly stories: Schema.compose<Schema.Int, Schema.NumberFromString>
    readonly doorman: Schema.decodeTo<
      Schema.Struct<
        {
          readonly homeIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
          readonly workIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
          readonly placedDreamJob: Schema.decodeTo<Schema.Boolean, Schema.Literals<readonly ["0", "1"]>, never, never>
          readonly dreamJobIndex: Schema.decodeTo<Schema.Int, Schema.NumberFromString, never, never>
          readonly costume: Schema.optionalKey<
            Schema.Union<
              readonly [
                Schema.Literals<
                  Array<
                    | "blink"
                    | "_audioadsguy"
                    | "_parachute"
                    | "airline pilot"
                    | "aloha"
                    | "amigo"
                    | "angel"
                    | "apple_pie"
                    | "apron"
                    | "archaeologist"
                    | "astronaut"
                    | "avocado"
                    | "avocadont"
                    | "baby"
                    | "babyalien"
                    | "bald eagle"
                    | "balloon"
                    | "banana"
                    | "barber"
                    | "barista"
                    | "baseball uniform"
                    | "beach lifeguard"
                    | "beach_boy"
                    | "beach_girl"
                    | "bear"
                    | "bee suit"
                    | "bellhop"
                    | "betsy ross"
                    | "bikachu"
                    | "biker"
                    | "birthday"
                    | "reaper"
                    | "bitman"
                    | "black dress"
                    | "black ranger"
                    | "blacksmith"
                    | "blue egg"
                    | "blue ranger"
                    | "blue suit"
                    | "book"
                    | "boxer"
                    | "brick"
                    | "bride"
                    | "brown dress"
                    | "buddy_elf"
                    | "bunny"
                    | "bunnyeaster"
                    | "burglar"
                    | "business suit"
                    | "butterfly"
                    | "candy_cane"
                    | "captain bit"
                    | "carrot"
                    | "cat suit"
                    | "caveman"
                    | "cheerleader"
                    | "cheese_wedge"
                    | "chef"
                    | "chick"
                    | "chicken"
                    | "chinese_lantern"
                    | "chinese suit"
                    | "chocolate_egg"
                    | "christmas rudolph"
                    | "christmas_boy"
                    | "christmas_carl"
                    | "christmas_elf"
                    | "christmas_tree"
                    | "clown"
                    | "coastguard"
                    | "construction"
                    | "convict"
                    | "cookie"
                    | "cool_bread"
                    | "corn"
                    | "corn_cob"
                    | "cossack"
                    | "cowboy"
                    | "creamy_bowl"
                    | "creepy"
                    | "delivery"
                    | "detective"
                    | "devil"
                    | "dinosaur"
                    | "disco"
                    | "diver"
                    | "dj"
                    | "doctor"
                    | "drumstick_buddy"
                    | "dummy"
                    | "egg"
                    | "elephant"
                    | "elf"
                    | "elvis"
                    | "emperor"
                    | "engineer"
                    | "evil_plant"
                    | "evilmistress"
                    | "executioner"
                    | "explorer"
                    | "eyepatch"
                    | "fairy"
                    | "famous construct"
                    | "farmer"
                    | "fast food uniform"
                    | "firecracker"
                    | "fireman"
                    | "fishing"
                    | "flower"
                    | "flower_girl"
                    | "folklore"
                    | "football player"
                    | "french maid"
                    | "fried_egg"
                    | "frog suit"
                    | "g-man"
                    | "gangster"
                    | "geisha"
                    | "general washington"
                    | "gentleman"
                    | "ghost"
                    | "ghost arrow"
                    | "ghost devil"
                    | "ghost hexe"
                    | "ghost trick treat"
                    | "ghost vampire"
                    | "ghosthustler"
                    | "gift"
                    | "gingerbread"
                    | "gold dress"
                    | "golden_ornament"
                    | "golfer"
                    | "goth"
                    | "graduate"
                    | "green ranger"
                    | "groom"
                    | "grunch"
                    | "guard"
                    | "hatchling"
                    | "hatchlingblue"
                    | "hay_bale"
                    | "hazmat"
                    | "heart"
                    | "hippie"
                    | "horse"
                    | "hotdog"
                    | "hula_girl"
                    | "hunter"
                    | "ice cream master"
                    | "ice queen"
                    | "ice_cream_cone"
                    | "icecube"
                    | "influencer"
                    | "inquisitor"
                    | "inuit"
                    | "ironbit"
                    | "jet helmet"
                    | "jolly_gift"
                    | "judge"
                    | "kangaroo"
                    | "karate outfit"
                    | "king"
                    | "knight"
                    | "krampus"
                    | "krampus_2"
                    | "lab coat"
                    | "lady"
                    | "leather jacket"
                    | "lecter"
                    | "leprechaun"
                    | "liberty"
                    | "librarian"
                    | "lion_dancer"
                    | "lumberjack"
                    | "mad hatter"
                    | "mad scientist"
                    | "magician"
                    | "maid"
                    | "mama_claus"
                    | "mapple genius"
                    | "mask"
                    | "massive coat"
                    | "milk_glass"
                    | "milky"
                    | "mime"
                    | "miss_tletoe"
                    | "moai"
                    | "monkey"
                    | "monster suit"
                    | "mountie"
                    | "mr_pieman"
                    | "mummy"
                    | "native american"
                    | "neanderthal"
                    | "nerd"
                    | "ninja"
                    | "nurse"
                    | "old diver"
                    | "overalls"
                    | "panda hat"
                    | "panda suit"
                    | "paparazzi"
                    | "peppermint_candy"
                    | "phantom"
                    | "pharaoh"
                    | "photography lover"
                    | "piggy"
                    | "pilgrim"
                    | "pilgrim_man"
                    | "pilgrim_man_2"
                    | "pilgrim_woman"
                    | "pilgrim_woman_2"
                    | "pilot headset"
                    | "pinecone"
                    | "pink egg"
                    | "pink ranger"
                    | "pirate"
                    | "pizza"
                    | "plague"
                    | "plumber a"
                    | "plumber b"
                    | "pool lifeguard"
                    | "potato_bowl"
                    | "princess"
                    | "professor"
                    | "pumpkin"
                    | "pumpkin_man"
                    | "pumpkin_woman"
                    | "queen_bee"
                    | "racoon"
                    | "race driver"
                    | "red baron"
                    | "red dress"
                    | "red hat"
                    | "red ranger"
                    | "red suit"
                    | "red_ornament"
                    | "revolutionary british"
                    | "revolutionary usa"
                    | "rockstar"
                    | "roman"
                    | "rudolph_2"
                    | "runway"
                    | "sailor"
                    | "sakura"
                    | "salesman"
                    | "samurai"
                    | "sanitation"
                    | "santa"
                    | "santa_claus"
                    | "santas_hat"
                    | "security"
                    | "sera"
                    | "shark"
                    | "sheep"
                    | "shimmering_star"
                    | "skier a"
                    | "skier b"
                    | "snapdog"
                    | "snow_queen"
                    | "snowbit"
                    | "snowflake"
                    | "snowman"
                    | "soccer"
                    | "soldier"
                    | "sour_apple"
                    | "spaghetti_and_meatballs"
                    | "sparkling_ribbon"
                    | "spring_bee"
                    | "spring_bunny"
                    | "spud"
                    | "star captain"
                    | "stocking"
                    | "student tourist"
                    | "summer dj"
                    | "sumo"
                    | "sunflower"
                    | "super hero"
                    | "superbit"
                    | "surgeon"
                    | "swimmer"
                    | "toga"
                    | "tourist"
                    | "tourist diver"
                    | "travel agent"
                    | "tree_trunk"
                    | "trooper"
                    | "turkey_friend"
                    | "turkey_man"
                    | "turkey_woman"
                    | "uncle sam"
                    | "uni_student"
                    | "unicorn"
                    | "usher"
                    | "vampire"
                    | "viking"
                    | "waiter"
                    | "waldo"
                    | "watermelon"
                    | "werebit"
                    | "white suit"
                    | "witch"
                    | "yellow egg"
                    | "yellow ranger"
                    | "yeti"
                    | "young wizard"
                    | "zombie"
                    | "cyborg"
                    | "fez"
                    | "fishtank"
                    | "hot_cocoa"
                    | "robot"
                    | "snow_globe"
                  >
                >,
                Schema.String
              ]
            >
          >
          readonly vip: Schema.Union<
            readonly [
              Schema.Union<
                readonly [
                  Schema.decodeTo<Schema.Literal<"None">, Schema.Literal<"0">, never, never>,
                  Schema.decodeTo<Schema.Literal<"Engineer">, Schema.Literal<"1">, never, never>,
                  Schema.decodeTo<Schema.Literal<"TravelAgent">, Schema.Literal<"2">, never, never>,
                  Schema.decodeTo<Schema.Literal<"Deliveryman">, Schema.Literal<"3">, never, never>,
                  Schema.decodeTo<Schema.Literal<"BigSpender">, Schema.Literal<"4">, never, never>,
                  Schema.decodeTo<Schema.Literal<"Celebrity">, Schema.Literal<"5">, never, never>,
                  Schema.decodeTo<Schema.Literal<"GiftBit">, Schema.Literal<"6">, never, never>
                ]
              >,
              Schema.compose<Schema.Int, Schema.NumberFromString>
            ]
          >
          readonly customName: Schema.optionalKey<Schema.String>
          readonly pet: Schema.optionalKey<
            Schema.Literals<
              Array<
                | "bald_eagle"
                | "bear"
                | "bee"
                | "chick"
                | "chicken"
                | "christmas_rudolph"
                | "egg"
                | "elephant"
                | "frog"
                | "horse"
                | "kangaroo"
                | "monkey"
                | "panda"
                | "raccoon"
                | "sheep"
                | "snowman"
                | "unicorn"
                | "robot"
                | "ankylosaurus"
                | "beaver"
                | "butterfly_blue"
                | "cactus"
                | "cat"
                | "camel"
                | "capybara"
                | "chipmunk"
                | "cockatoo"
                | "cougar"
                | "cow"
                | "coyote"
                | "crocodile"
                | "dino_toy"
                | "diplodocus"
                | "direwolf"
                | "dog"
                | "dragon"
                | "eagle"
                | "echidna"
                | "elk"
                | "fox"
                | "giraffe"
                | "goat"
                | "gorilla"
                | "griffin"
                | "hippo"
                | "koala"
                | "lemur"
                | "lion"
                | "mammoth"
                | "moose"
                | "muskox"
                | "opossum"
                | "otter"
                | "owl"
                | "penguin"
                | "pika"
                | "pig"
                | "pigeon"
                | "platypus"
                | "polar_bear"
                | "rabbit"
                | "rat"
                | "rhino"
                | "rock"
                | "rover"
                | "seal"
                | "skunk"
                | "snake"
                | "spider"
                | "squirrel"
                | "stegosaurus"
                | "tiger"
                | "toucan"
                | "tribble"
                | "triceratops"
                | "turtle"
                | "tyrannosaur"
                | "velociraptor"
                | "walrus"
                | "zebra"
                | "black_panther"
                | "chameleon"
                | "duck"
                | "chicks"
                | "lamb"
                | "crow"
                | "iguana"
                | "redpanda"
                | "badger"
                | "black_bear"
                | "bluejay"
                | "rattlesnake"
                | "sloth"
                | "thylacine"
                | "ant_farm"
                | "crab"
                | "octopus"
                | "sponge"
                | "ibex"
                | "porcupine"
                | "bat"
                | "dog_skeleton"
                | "slime"
                | "tentacle"
                | "artic_fox"
                | "saint_bernard"
                | "husky"
                | "box_pet"
                | "elasmotherium"
                | "lemming"
                | "snow_leopard"
                | "armadillo"
                | "hyena"
                | "kiwi"
                | "vulture"
                | "komodo"
                | "turkey"
                | "deer"
                | "christmas_penguin"
                | "cat_in_a_bag"
              >
            >
          >
          readonly attributes: Schema.suspend<
            Schema.decodeTo<
              Schema.Struct<{
                readonly $unknown: Schema.$Array<Schema.String>
                readonly gender: Schema.Literals<readonly ["female", "male"]>
                readonly name: Schema.String
                readonly birthday: Schema.Tuple<readonly [Schema.Int, Schema.Int]>
                readonly designColors: Schema.Struct<{
                  readonly pantColor: Schema.toType<
                    Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                        ]
                      >,
                      never,
                      never
                    >
                  >
                  readonly shirtColor: Schema.toType<
                    Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                        ]
                      >,
                      never,
                      never
                    >
                  >
                  readonly skinColorIndex: Schema.Number
                  readonly hairColorIndex: Schema.Number
                  readonly shoeColorIndex: Schema.Number
                }>
                readonly accessories: Schema.Struct<{
                  readonly glasses: Schema.Result<Schema.Number, Schema.Number>
                  readonly hairAccessory: Schema.Result<Schema.Number, Schema.Number>
                  readonly tie: Schema.Result<
                    Schema.toType<
                      Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                          ]
                        >,
                        never,
                        never
                      >
                    >,
                    Schema.toType<
                      Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                          ]
                        >,
                        never,
                        never
                      >
                    >
                  >
                  readonly earrings: Schema.Result<
                    Schema.toType<
                      Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                          ]
                        >,
                        never,
                        never
                      >
                    >,
                    Schema.toType<
                      Schema.decodeTo<
                        Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                        Schema.TemplateLiteralParser<
                          readonly [
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>,
                            ":",
                            Schema.compose<Schema.Finite, Schema.NumberFromString>
                          ]
                        >,
                        never,
                        never
                      >
                    >
                  >
                  readonly hat: Schema.Result<
                    Schema.Struct<{
                      readonly index: Schema.Number
                      readonly gender: Schema.Literals<readonly ["female", "male", "bi"]>
                      readonly color: Schema.toType<
                        Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                              ":",
                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                              ":",
                              Schema.compose<Schema.Finite, Schema.NumberFromString>
                            ]
                          >,
                          never,
                          never
                        >
                      >
                    }>,
                    Schema.Struct<{
                      readonly index: Schema.Number
                      readonly color: Schema.toType<
                        Schema.decodeTo<
                          Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                          Schema.TemplateLiteralParser<
                            readonly [
                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                              ":",
                              Schema.compose<Schema.Finite, Schema.NumberFromString>,
                              ":",
                              Schema.compose<Schema.Finite, Schema.NumberFromString>
                            ]
                          >,
                          never,
                          never
                        >
                      >
                    }>
                  >
                }>
                readonly skills: Schema.Struct<{
                  readonly food: Schema.Int
                  readonly retail: Schema.Int
                  readonly service: Schema.Int
                  readonly creative: Schema.Int
                  readonly recreation: Schema.Int
                }>
              }>,
              Schema.decodeTo<
                Schema.Struct<
                  {
                    male: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    firstNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    lastNameIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    birthMonth: Schema.compose<Schema.Int, Schema.NumberFromString>
                    birthDay: Schema.compose<Schema.Int, Schema.NumberFromString>
                    skinColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    hairColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    shoeColorIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    pantColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                        ]
                      >,
                      never,
                      never
                    >
                    shirtColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                        ]
                      >,
                      never,
                      never
                    >
                    hasGlasses: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    glassesIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    hasTie: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    tieColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                        ]
                      >,
                      never,
                      never
                    >
                    hasHairAccessory: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hairAccessoryIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    hasBiHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasMaleHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hasFemaleHat: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    hatIndex: Schema.compose<Schema.Number, Schema.NumberFromString>
                    hatColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                        ]
                      >,
                      never,
                      never
                    >
                    hasEarrings: Schema.compose<
                      Schema.Boolean,
                      Schema.Union<
                        readonly [
                          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>,
                          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>
                        ]
                      >
                    >
                    earringsColor: Schema.decodeTo<
                      Schema.Struct<{ readonly r: Schema.Int; readonly g: Schema.Int; readonly b: Schema.Int }>,
                      Schema.TemplateLiteralParser<
                        readonly [
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>,
                          ":",
                          Schema.compose<Schema.Finite, Schema.NumberFromString>
                        ]
                      >,
                      never,
                      never
                    >
                    skillFood: Schema.compose<Schema.Int, Schema.NumberFromString>
                    skillService: Schema.compose<Schema.Int, Schema.NumberFromString>
                    skillRecreation: Schema.compose<Schema.Int, Schema.NumberFromString>
                    skillRetail: Schema.compose<Schema.Int, Schema.NumberFromString>
                    skillCreative: Schema.compose<Schema.Int, Schema.NumberFromString>
                  } & { readonly $unknown: Schema.$Array<Schema.String> }
                >,
                Schema.String,
                never,
                never
              >,
              never,
              never
            >
          >
        } & {
          readonly $unknown: Schema.$Record<
            Schema.String,
            Schema.Struct<{
              value: Schema.String
              $locationMetadata: Schema.Struct<{ after: Schema.NullishOr<Schema.String> }>
            }>
          >
        }
      >,
      Schema.String,
      never,
      never
    >
    readonly maxGold: Schema.compose<Schema.Int, Schema.NumberFromString>
    readonly requestedFloorId: Schema.compose<Schema.Int, Schema.NumberFromString>
    readonly bitbook: Schema.optionalKey<Schema.String>
    readonly ts: Schema.String
    readonly vip: Schema.compose<
      Schema.Boolean,
      Schema.Union<
        readonly [
          Schema.decodeTo<Schema.Literal<true>, Schema.Literal<"1">, never, never>,
          Schema.decodeTo<Schema.Literal<false>, Schema.Literal<"0">, never, never>
        ]
      >
    >
  }>,
  {
    readonly stories: "level"
    readonly doorman: "avatar"
    readonly maxGold: "mg"
    readonly requestedFloorId: "reqFID"
    readonly bitbook: "bb"
  }
>
```

[Source](https://github.com/leonitousconforti/tinyburg/blob/main/packages/tinytower-sdk/src/Endpoints.ts#L73)

Since v1.0.0
