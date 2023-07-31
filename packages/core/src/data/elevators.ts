/**
 * This file was auto-generated by a frida agent
 *
 * Generated by:
 * /workspaces/tinyburg/packages/insight/dist/src/agents/get-elevator-data.js
 *
 * With TinyTower version: 4.23.1
 *
 * On: Mon, 31 Jul 2023 04:19:25 GMT
 */

export const upgradeElevatorCost = (liftSpeed: number) => {
    return liftSpeed * liftSpeed * 100;
};

export const numberElevators = 30 as const;

export const elevators = [
    {
        name: "Trusty Rusty",
        buxcost: 1,
        yoffset: "-12",
        animations: [
            { element: "elevatorflicker", x: 0, y: 65, frontlayer: 1, ftime: "0.1", loopdelay: [] },
            { element: "sparks", x: 2, y: 34, ftime: "0.05", frontlayer: 1, additive: true, loopdelay: [] },
        ],
    },
    {
        name: "Steel Series SE",
        buxcost: 500,
        yoffset: "-12",
        animations: [{ element: "elevator1anim", x: 0, y: 19, ftime: "1" }],
    },
    {
        name: "Pullman Prestige",
        buxcost: 1000,
        yoffset: "-12",
        animations: [{ element: "elevator2anim", x: 3, y: 52, ftime: "0.25" }],
    },
    {
        name: "Litestripe 3000",
        buxcost: 1500,
        yoffset: "-12",
        animations: [{ element: "elevator3neon", x: 0, y: 65, cyclecolor: "8", additive: true }],
    },
    {
        name: "Disco Lift",
        buxcost: 2500,
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
        buxcost: 2000,
        yoffset: "-12",
        animations: [
            { element: "torch", x: 2, y: 27, ftime: "0.13" },
            { element: "torch", x: 24, y: 27, ftime: "0.13", startframe: 4 },
        ],
    },
    {
        name: "NB200 Commercial Lift",
        buxcost: 250,
        yoffset: "-12",
        animations: [{ element: "elevlight", x: 7, y: 17, ftime: "0.13" }],
    },
    {
        name: "Insta-Lift 200 SE",
        buxcost: 500,
        yoffset: "-12",
        animations: [{ element: "elevstrip", x: 7, y: 17, ftime: "0.13" }],
    },
    {
        name: "Ultra-Lift 3000 Extreme",
        buxcost: 2500,
        yoffset: "-12",
        animations: [
            { element: "goldstrip", x: 7, y: 17, ftime: "0.13" },
            { element: "goldshine", x: 0, y: 65, ftime: "0.04", loopdelay: [] },
        ],
    },
    {
        name: "Infini-lift lightspeed",
        buxcost: 2500,
        yoffset: "-12",
        animations: [
            { element: "bluring", x: 4, y: 5, ftime: "0.1" },
            { element: "bluring", x: 21, y: 5, ftime: "0.1" },
            { element: "blubars", x: 9, y: 9, ftime: "0.1" },
            { element: "blublink", x: 4, y: 17, ftime: "0.25" },
            { element: "bludoor", x: 5, y: 51, ftime: "0.05" },
        ],
    },
    { name: "Glass Lift", buxcost: 2500, yoffset: "-12" },
    { name: "Police Box", buxcost: 2500, yoffset: "-12" },
    { name: "Metal Cage", buxcost: 250, yoffset: "-12" },
    { name: "Halloween Lift", holiday: "Halloween", buxcost: 2500, yoffset: "-12" },
    {
        name: "Holiday Lift",
        holiday: "The Holidays",
        buxcost: 2500,
        yoffset: "-12",
        animations: [{ element: "xmaslift", x: 0, y: 85, ftime: "0.5" }],
    },
    { name: "Marble Lift", buxcost: 5000, yoffset: "-12" },
    {
        name: "Hydro Lift",
        buxcost: 10000,
        yoffset: "-256",
        animations: [{ element: "waterlift", x: 0, y: 3, ftime: "0.1" }],
    },
    { name: "Tree Lift", buxcost: 5000, yoffset: "-12" },
    { name: "Easter Lift", buxcost: 9999, hidden: true, yoffset: "-6" },
    { name: "Independence Lift", holiday: "Independence Day", buxcost: 1000, yoffset: "-11" },
    { name: "Liberty Lift", holiday: "Independence Day", buxcost: 1000, yoffset: "-11" },
    { name: "Pineapple", buxcost: 9999, hidden: true, yoffset: "-14" },
    { name: "Jungle", buxcost: 1000, holiday: "Summer", yoffset: "-13", doorOffsetX: "1" },
    { name: "pumpkin cage", buxcost: 9999, hidden: true, yoffset: "-10" },
    { name: "iron maiden", buxcost: 1000, holiday: "Halloween", yoffset: "-10" },
    { name: "green present", buxcost: 1000, holiday: "The Holidays", yoffset: "-6" },
    { name: "ski lift", buxcost: 9999, hidden: true, yoffset: "-13", xDoorOffset: "1", yDoorOffset: "-1" },
    { name: "Elevator of Freedom", buxcost: 1000, yoffset: "-13", hidden: true },
    { name: "Cooling Elevator", buxcost: 9999, yoffset: "-13", yDoorOffset: "3", hidden: true },
    { name: "Ice Cream", buxcost: 1000, yoffset: "-18", holiday: "IceCream" },
] as const;
export type Elevator = (typeof elevators)[number];
