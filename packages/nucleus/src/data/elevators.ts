/**
 * This file was auto-generated by a frida agent
 *
 * Generated by:
 * /workspaces/tinyburg/packages/insight/dist/src/agents/get-elevator-data.js
 *
 * With TinyTower version: 5.2.1
 *
 * On: Wed, 08 May 2024 23:06:24 GMT
 */

export const upgradeElevatorCost = (liftSpeed: number) => {
    return liftSpeed * liftSpeed * 100;
};

export const numberElevators = 44 as const;

export const elevators = [
    {
        name: "Trusty Rusty",
        yoffset: "-12",
        animations: [
            { element: "elevatorflicker", x: 0, y: 65, frontlayer: 1, ftime: "0.1", loopdelay: [] },
            { element: "sparks", x: 2, y: 34, ftime: "0.05", frontlayer: 1, additive: true, loopdelay: [] },
        ],
    },
    { name: "Steel Series SE", yoffset: "-12", animations: [{ element: "elevator1anim", x: 0, y: 19, ftime: "1" }] },
    {
        name: "Pullman Prestige",
        yoffset: "-12",
        animations: [{ element: "elevator2anim", x: 3, y: 52, ftime: "0.25" }],
    },
    {
        name: "Litestripe 3000",
        yoffset: "-12",
        animations: [{ element: "elevator3neon", x: 0, y: 65, cyclecolor: "8", additive: true }],
    },
    {
        name: "Disco Lift",
        yoffset: "-12",
        animations: [
            { element: "elevator4floor", x: 2, y: 53, ftime: "0.35" },
            { element: "discoball", x: 5, y: 12, ftime: "0.2" },
            { element: "discoball", x: 5, y: 12, ftime: "0.2", additive: true, cyclecolor: "8" },
            { element: "elevator4color", x: 2, y: 51, frontlayer: 1, additive: true, ftime: "0.08", cyclecolor: "8" },
        ],
    },
    {
        name: "Egyptian Lift",
        yoffset: "-12",
        animations: [
            { element: "torch", x: 2, y: 27, ftime: "0.13" },
            { element: "torch", x: 24, y: 27, ftime: "0.13", startframe: 4 },
        ],
    },
    {
        name: "NB200 Commercial Lift",
        yoffset: "-12",
        animations: [{ element: "elevlight", x: 7, y: 17, ftime: "0.13" }],
    },
    { name: "Insta-Lift 200 SE", yoffset: "-12", animations: [{ element: "elevstrip", x: 7, y: 17, ftime: "0.13" }] },
    {
        name: "Ultra-Lift 3000 Extreme",
        yoffset: "-12",
        animations: [
            { element: "goldstrip", x: 7, y: 17, ftime: "0.13" },
            { element: "goldshine", x: 0, y: 65, ftime: "0.04", loopdelay: [] },
        ],
    },
    {
        name: "Infini-lift lightspeed",
        yoffset: "-12",
        animations: [
            { element: "bluring", x: 4, y: 5, ftime: "0.1" },
            { element: "bluring", x: 21, y: 5, ftime: "0.1" },
            { element: "blubars", x: 9, y: 9, ftime: "0.1" },
            { element: "blublink", x: 4, y: 17, ftime: "0.25" },
            { element: "bludoor", x: 5, y: 51, ftime: "0.05" },
        ],
    },
    { name: "Glass Lift", yoffset: "-12" },
    { name: "Police Box", yoffset: "-12" },
    { name: "Metal Cage", yoffset: "-12" },
    { name: "Halloween Lift", holiday: "Halloween", yoffset: "-12" },
    {
        name: "Holiday Lift",
        holiday: "The Holidays",
        yoffset: "-12",
        animations: [{ element: "xmaslift", x: 0, y: 85, ftime: "0.5" }],
    },
    { name: "Marble Lift", yoffset: "-12" },
    { name: "Hydro Lift", yoffset: "-256", animations: [{ element: "waterlift", x: 0, y: 3, ftime: "0.1" }] },
    { name: "Tree Lift", yoffset: "-12" },
    { name: "Easter Lift", hidden: true, yoffset: "-6" },
    { name: "Independence Lift", holiday: "Independence Day", yoffset: "-11" },
    { name: "Liberty Lift", holiday: "Independence Day", yoffset: "-11" },
    { name: "Pineapple", hidden: true, yoffset: "-14" },
    { name: "Jungle", holiday: "Summer", yoffset: "-13", doorOffsetX: "1" },
    { name: "pumpkin cage", hidden: true, yoffset: "-10" },
    { name: "iron maiden", holiday: "Halloween", yoffset: "-10" },
    { name: "green present", holiday: "The Holidays", yoffset: "-6" },
    { name: "ski lift", hidden: true, yoffset: "-13", xDoorOffset: "1", yDoorOffset: "-1" },
    { name: "Elevator of Freedom", yoffset: "-13", hidden: true },
    { name: "Cooling Elevator", yoffset: "-13", yDoorOffset: "3", hidden: true },
    { name: "Ice Cream", yoffset: "-18", holiday: "IceCream" },
    { name: "Lifeguard", yoffset: "-16", xoffset: "-2", xDoorOffset: "2", hidden: true, holiday: "SummerEvent" },
    {
        name: "Grim elevator",
        yoffset: "-6",
        xDoorOffset: "-3",
        hidden: true,
        holiday: "Halloween",
        animations: [{ element: "elevator31anim", x: 12, y: 18, ftime: "0.1" }],
    },
    {
        name: "Coffin elevator",
        yoffset: "-15",
        yDoorOffset: "5",
        hidden: true,
        holiday: "Halloween",
        animations: [{ element: "elevator31anim", x: 12, y: 7, ftime: "0.1" }],
    },
    { name: "Pilgrims elevator", yoffset: "-10", yDoorOffset: "-3", xDoorOffset: "-7", holiday: "Thanksgiving" },
    {
        name: "Pumpkin elevator",
        yoffset: "-1",
        yDoorOffset: "-3",
        xDoorOffset: "-7",
        hidden: true,
        holiday: "Thanksgiving",
    },
    { name: "Jingle bells elevator", xDoorOffset: "-3", hidden: true, holiday: "The Holidays" },
    { name: "North pole elevator", yoffset: "-6", xDoorOffset: "-3", yDoorOffset: "2", holiday: "The Holidays" },
    { name: "Heart elevator", hidden: true, yoffset: "-6", xDoorOffset: "-3", yDoorOffset: "2" },
    {
        name: "Leprechaun beverage elevator",
        hidden: true,
        yoffset: "-8",
        xDoorOffset: "1",
        yDoorOffset: "-2",
        animations: [{ element: "elevator38anim", x: 8, y: 49, frontlayer: 1, additive: true, ftime: "0.1" }],
    },
    { name: "St. Patrick's hat elevator", yoffset: "-13", xDoorOffset: "-1" },
    { name: "Bunny hop elevator", hidden: true, yoffset: "-7", xDoorOffset: "-7" },
    { name: "Egg basket elevator", xoffset: "0", xDoorOffset: "-2", yDoorOffset: "-1" },
    { name: "Blossom Tree Elevator", hidden: true, yoffset: "-8", xDoorOffset: "-7" },
    { name: "Bloom Elevator", yoffset: "-8", xDoorOffset: "-3" },
] as const;
export type Elevator = (typeof elevators)[number];
