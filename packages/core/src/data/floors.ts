/**
 * This file was auto-generated by a frida agent
 *
 * Generated by:
 * /workspaces/tinyburg/packages/insight/dist/src/agents/get-floor-data.js
 *
 * With TinyTower version: 4.23.1
 *
 * On: Mon, 31 Jul 2023 04:19:56 GMT
 */

export const buildFloorCost = (numFloors: number) => {
    const num1 = numFloors - 1;
    const num2 = Math.max(5000, Math.ceil(num1 * num1 * 500 - (12 - num1) * 9000));
    return num2 - (num2 % 1000);
};

export enum FloorType {
    None = "None",
    Food = "Food",
    Retail = "Retail",
    Entertainment = "Entertainment",
    Casino = "Casino",
    Hotel = "Hotel",
    Lobby = "Lobby",
    Creative = "Creative",
    Residential = "Residential",
    Empty = "Empty",
    Service = "Service",
    VIPLounge = "VIPLounge",
}

export const floors = [
    { name: "Sushi Bar", type: FloorType.Food },
    { name: "Mexican Food", type: FloorType.Food },
    { name: "Tea House", type: FloorType.Food },
    { name: "Vegan Food", type: FloorType.Food },
    { name: "Frozen Yogurt", type: FloorType.Food },
    { name: "Smoothie Shop", type: FloorType.Food },
    { name: "Sub Shop", type: FloorType.Food },
    { name: "Coffee House", type: FloorType.Food },
    { name: "Sky Burger", type: FloorType.Food },
    { name: "Asian Cuisine", type: FloorType.Food },
    { name: "Diner", type: FloorType.Food },
    { name: "Pub", type: FloorType.Food },
    { name: "Pizza Place", type: FloorType.Food },
    { name: "Scoops", type: FloorType.Food },
    { name: "Bakery", type: FloorType.Food },
    { name: "Fancy Cuisine", type: FloorType.Food },
    { name: "Barber Shop", type: FloorType.Service },
    { name: "Day Spa", type: FloorType.Service },
    { name: "Dentists Office", type: FloorType.Service },
    { name: "Doctors Office", type: FloorType.Service },
    { name: "Fortune Teller", type: FloorType.Service },
    { name: "Optometrist", type: FloorType.Service },
    { name: "Health Club", type: FloorType.Service },
    { name: "Martial Arts", type: FloorType.Service },
    { name: "Wedding Chapel", type: FloorType.Service },
    { name: "Laundromat", type: FloorType.Service },
    { name: "Private eye", type: FloorType.Service },
    { name: "Tutoring Center", type: FloorType.Service },
    { name: "Travel Agency", type: FloorType.Service },
    { name: "Ship & Print", type: FloorType.Service },
    { name: "Pharmacy", type: FloorType.Service },
    { name: "Bank", type: FloorType.Service },
    { name: "Arcade", type: FloorType.Entertainment },
    { name: "Video Rental", type: FloorType.Entertainment },
    { name: "Museum", type: FloorType.Entertainment },
    { name: "Aquarium", type: FloorType.Entertainment },
    { name: "Cineplex", type: FloorType.Entertainment },
    { name: "Theater", type: FloorType.Entertainment },
    { name: "Planetarium", type: FloorType.Entertainment },
    { name: "Plainlake Apts.", type: FloorType.Residential },
    { name: "Sweetside Apts.", type: FloorType.Residential },
    { name: "Tuscana Apts.", type: FloorType.Residential },
    { name: "Lotus Apts.", type: FloorType.Residential },
    { name: "Moderna Apts.", type: FloorType.Residential },
    { name: "Chateau Apts.", type: FloorType.Residential },
    { name: "50's Apts.", type: FloorType.Residential },
    { name: "Santa Fe Apts.", type: FloorType.Residential },
    { name: "Gothic Apts.", type: FloorType.Residential },
    { name: "Art Deco Apts.", type: FloorType.Residential },
    { name: "Rustic Apts.", type: FloorType.Residential },
    { name: "Eclectic Apts.", type: FloorType.Residential },
    { name: "Broadleaf Apts.", type: FloorType.Residential },
    { name: "Safari Apts.", type: FloorType.Residential },
    { name: "70's Apts.", type: FloorType.Residential },
    { name: "Loft Apts.", type: FloorType.Residential },
    { name: "Mini Golf", type: FloorType.Entertainment },
    { name: "Volleyball Club", type: FloorType.Entertainment },
    { name: "Racquetball", type: FloorType.Entertainment },
    { name: "__Empty String__", type: FloorType.Empty },
    { name: "undefined", type: FloorType.None },
    { name: "Bowling Alley", type: FloorType.Entertainment },
    { name: "Cyber Cafe", type: FloorType.Entertainment },
    { name: "Paintball Arena", type: FloorType.Entertainment },
    { name: "Night Club", type: FloorType.Entertainment },
    { name: "Casino", type: FloorType.Entertainment },
    { name: "Comedy Club", type: FloorType.Entertainment },
    { name: "Toy Store", type: FloorType.Retail },
    { name: "Mapple Store", type: FloorType.Retail },
    { name: "Book Store", type: FloorType.Retail },
    { name: "Shoe Store", type: FloorType.Retail },
    { name: "Hat Shop", type: FloorType.Retail },
    { name: "Record Shop", type: FloorType.Retail },
    { name: "Music Store", type: FloorType.Retail },
    { name: "Bike Shop", type: FloorType.Retail },
    { name: "Comic Store", type: FloorType.Retail },
    { name: "Furniture Store", type: FloorType.Retail },
    { name: "Plant Nursery", type: FloorType.Retail },
    { name: "Fabric Shop", type: FloorType.Retail },
    { name: "Mens Fashion", type: FloorType.Retail },
    { name: "Womens Fashion", type: FloorType.Retail },
    { name: "Tech Store", type: FloorType.Retail },
    { name: "Game Store", type: FloorType.Retail },
    { name: "Tattoo Parlor", type: FloorType.Creative },
    { name: "Software Studio", type: FloorType.Creative },
    { name: "Pottery Studio", type: FloorType.Creative },
    { name: "Glass Studio", type: FloorType.Creative },
    { name: "Art Studio", type: FloorType.Creative },
    { name: "Photo Studio", type: FloorType.Creative },
    { name: "Fashion Studio", type: FloorType.Creative },
    { name: "Recording Studio", type: FloorType.Creative },
    { name: "Wood Shop", type: FloorType.Creative },
    { name: "Architect Office", type: FloorType.Creative },
    { name: "Graphic Design", type: FloorType.Creative },
    { name: "Film Studio", type: FloorType.Creative },
    { name: "Ad Agency", type: FloorType.Creative },
    { name: "Game Studio", type: FloorType.Creative },
    { name: "Cake Studio", type: FloorType.Creative },
    { name: "Soda Brewery", type: FloorType.Creative },
    { name: "High Tech Apts.", type: FloorType.Residential },
    { name: "Garden Apts.", type: FloorType.Residential },
    { name: "Baycrest Apts.", type: FloorType.Residential },
    { name: "Mismatch Apts.", type: FloorType.Residential },
    { name: "Nerd Cave Apts.", type: FloorType.Residential },
    { name: "Zen Apts.", type: FloorType.Residential },
    { name: "Beach Apts.", type: FloorType.Residential },
    { name: "Club Apts.", type: FloorType.Residential },
    { name: "Hacienda Apts.", type: FloorType.Residential },
    { name: "Greek Apts.", type: FloorType.Residential },
    { name: "Storage Apts.", type: FloorType.Residential },
    { name: "Brightpoint Apts.", type: FloorType.Residential },
    { name: "Cottage Apts.", type: FloorType.Residential },
    { name: "Greenwood Apts.", type: FloorType.Residential },
    { name: "Aquatic Apts.", type: FloorType.Residential },
    { name: "Stonecrest Apts.", type: FloorType.Residential },
    { name: "Bridgeview Apts.", type: FloorType.Residential },
    { name: "Fawlty Apts.", type: FloorType.Residential },
    { name: "Estate Apts.", type: FloorType.Residential },
    { name: "Pinehurst Apts.", type: FloorType.Residential },
    { name: "HiFi Apts.", type: FloorType.Residential },
    { name: "Birchside Apts.", type: FloorType.Residential },
    { name: "Westgrove Apts.", type: FloorType.Residential },
    { name: "Plumbrook Apts.", type: FloorType.Residential },
    { name: "Glendale Apts.", type: FloorType.Residential },
    { name: "Ridgemill Apts.", type: FloorType.Residential },
    { name: "Goldcreek Apts.", type: FloorType.Residential },
    { name: "Silverwell Apts.", type: FloorType.Residential },
    { name: "Mesa Apts.", type: FloorType.Residential },
    { name: "Dover Apts.", type: FloorType.Residential },
    { name: "Mistmont Apts.", type: FloorType.Residential },
    { name: "Devonshire Apts.", type: FloorType.Residential },
    { name: "Mapleton Apts.", type: FloorType.Residential },
    { name: "Ivymoss Apts.", type: FloorType.Residential },
    { name: "Auto Dealer", type: FloorType.Retail },
    { name: "BBQ Place", type: FloorType.Food },
    { name: "Recycling", type: FloorType.Service },
    { name: "Floral Studio", type: FloorType.Creative },
    { name: "Rock Climbing", type: FloorType.Entertainment },
    { name: "Millspring Apts.", type: FloorType.Residential },
    { name: "Security Office", type: FloorType.Service },
    { name: "Karaoke Club", type: FloorType.Entertainment },
    { name: "Grocery Store", type: FloorType.Retail },
    { name: "Pancake House", type: FloorType.Food },
    { name: "Laboratory", type: FloorType.Creative },
    { name: "Tiki Apts.", type: FloorType.Residential },
    { name: "Submarine Apts.", type: FloorType.Residential },
    { name: "Anti Grav Apts.", type: FloorType.Residential },
    { name: "Courthouse", type: FloorType.Service },
    { name: "Haunted House", type: FloorType.Entertainment },
    { name: "Candle Shop", type: FloorType.Retail },
    { name: "Animation Studio", type: FloorType.Creative },
    { name: "Donut Shop", type: FloorType.Food },
    { name: "Egyptian Apts.", type: FloorType.Residential },
    { name: "Magic Apts.", type: FloorType.Residential },
    { name: "Roman Apts.", type: FloorType.Residential },
    { name: "Seafood", type: FloorType.Food },
    { name: "Jewelry Store", type: FloorType.Retail },
    { name: "Mechanic", type: FloorType.Service },
    { name: "Billiard Hall", type: FloorType.Entertainment },
    { name: "TV Studio", type: FloorType.Creative },
    { name: "Arctic Apts.", type: FloorType.Residential },
    { name: "Space Apts.", type: FloorType.Residential },
    { name: "Bachelor Apts.", type: FloorType.Residential },
    { name: "Archery Range", type: FloorType.Entertainment },
    { name: "Pet Shop", type: FloorType.Retail },
    { name: "Chocolatier", type: FloorType.Creative },
    { name: "Italian Food", type: FloorType.Food },
    { name: "Fire Station", type: FloorType.Service },
    { name: "College Apts.", type: FloorType.Residential },
    { name: "Party Apts.", type: FloorType.Residential },
    { name: "Honey Apts.", type: FloorType.Residential },
    { name: "Ship Apts.", type: FloorType.Residential },
    { name: "Park", type: FloorType.Entertainment },
    { name: "Surf Shop", type: FloorType.Retail },
    { name: "Stock Exchange", type: FloorType.Service },
    { name: "Clockmaker", type: FloorType.Creative },
    { name: "Cheese Shop", type: FloorType.Food },
    { name: "Temple Apts.", type: FloorType.Residential },
    { name: "Holiday Apts.", type: FloorType.Residential },
    { name: "Hot Dog Joint", type: FloorType.Food },
    { name: "Plumber", type: FloorType.Service },
    { name: "Circus", type: FloorType.Entertainment },
    { name: "Home Supply", type: FloorType.Retail },
    { name: "Sculpting Studio", type: FloorType.Creative },
    { name: "Low Rent Apts.", type: FloorType.Residential },
    { name: "Sunset Apts.", type: FloorType.Residential },
    { name: "Pet Apts.", type: FloorType.Residential },
    { name: "Airline Food", type: FloorType.Food },
    { name: "Stables", type: FloorType.Service },
    { name: "Golf Sim", type: FloorType.Entertainment },
    { name: "Robot Store", type: FloorType.Retail },
    { name: "Costume Shop", type: FloorType.Creative },
    { name: "Theater Apts.", type: FloorType.Residential },
    { name: "Overgrown Apts.", type: FloorType.Residential },
    { name: "Reef Apts.", type: FloorType.Residential },
    { name: "Lobby", type: FloorType.Lobby, buxcost: 1, character: "artmajor", fid: 194 },
    {
        name: "Roman Lobby",
        type: FloorType.Lobby,
        buxcost: 500,
        character: "artmajor",
        fid: 195,
        animations: [
            { element: "horsefountain", x: 69, y: 45, frontlayer: 1 },
            { element: "fountain", x: 72, y: 39, ftime: "0.2", frontlayer: 1 },
            { element: "floor1panels", x: 3, y: 10, cyclecolor: "16", additive: true },
        ],
    },
    { name: "Egyptian Lobby", type: FloorType.Lobby, buxcost: 1000, character: "artmajor", fid: 196 },
    { name: "Standard Lobby", type: FloorType.Lobby, buxcost: 1000, character: "artmajor", fid: 197 },
    {
        name: "New York Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 198,
        animations: [{ element: "nywater", x: 63, y: 43, ftime: "0.15" }],
    },
    {
        name: "Fun Fair Lobby",
        type: FloorType.Lobby,
        buxcost: 700,
        character: "artmajor",
        fid: 199,
        animations: [
            { element: "fairdoor", x: 32, y: 46, ftime: "0.3" },
            { element: "fairlight", x: 106, y: 18, ftime: "0.3" },
        ],
    },
    {
        name: "China Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 200,
        animations: [
            { element: "dragoneye", x: 84, y: 27, ftime: "0.07", loopdelay: [] },
            { element: "smoke", x: 88, y: 30, ftime: "0.2", additive: true },
        ],
    },
    {
        name: "Europe Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 201,
        animations: [{ element: "euroclock", x: 5, y: 19, ftime: "4" }],
    },
    {
        name: "Russia Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 202,
        animations: [
            { element: "glow", x: 2, y: 34, additive: true, ftime: "0.15", startframe: 3 },
            { element: "glow", x: 77, y: 34, additive: true, ftime: "0.15", startframe: 1 },
        ],
    },
    {
        name: "NASA Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 203,
        animations: [
            { element: "nasascreen", x: 3, y: 30, ftime: "0.3" },
            { element: "nasanum", x: 68, y: 6, ftime: "1" },
            { element: "nasamap", x: 77, y: 30, ftime: "0.1" },
            { element: "nasacomp", x: 61, y: 40, ftime: "0.1" },
        ],
    },
    { name: "Farm Lobby", type: FloorType.Lobby, buxcost: 700, character: "artmajor", fid: 204 },
    {
        name: "Island Lobby",
        type: FloorType.Lobby,
        buxcost: 700,
        character: "artmajor",
        fid: 205,
        animations: [{ element: "rockwater", x: 57, y: 43, ftime: "0.5" }],
    },
    {
        name: "UFO Lobby",
        type: FloorType.Lobby,
        buxcost: 700,
        character: "artmajor",
        fid: 206,
        animations: [{ element: "ufolight", x: 78, y: 26, ftime: "0.1" }],
    },
    {
        name: "British Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 207,
        animations: [
            { element: "glow", x: 46, y: 24, additive: true, ftime: "0.15", startframe: 1 },
            { element: "glow", x: 106, y: 24, additive: true, ftime: "0.15", startframe: 2 },
        ],
    },
    { name: "Taj Mahal Lobby", type: FloorType.Lobby, buxcost: 700, character: "artmajor", fid: 208 },
    {
        name: "Neon Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 209,
        animations: [
            { element: "neonbar", x: 0, y: 39, ftime: "0.2" },
            { element: "neontext", x: 63, y: 35, ftime: "0.1" },
        ],
    },
    {
        name: "Art Lobby",
        type: FloorType.Lobby,
        buxcost: 700,
        character: "artmajor",
        fid: 210,
        animations: [{ element: "glow", x: 29, y: 27, additive: true, ftime: "0.15", startframe: 1 }],
    },
    {
        name: "Greek Temple Lobby",
        type: FloorType.Lobby,
        buxcost: 700,
        character: "artmajor",
        fid: 211,
        animations: [
            { element: "greekfirea", x: 10, y: 16, ftime: "0.15" },
            { element: "greekfireb", x: 70, y: 16, ftime: "0.15" },
        ],
    },
    { name: "Jungle Temple Lobby", type: FloorType.Lobby, buxcost: 700, character: "artmajor", fid: 212 },
    { name: "Dojo Lobby", type: FloorType.Lobby, buxcost: 1000, character: "artmajor", fid: 213 },
    {
        name: "Halloween Lobby",
        type: FloorType.Lobby,
        holiday: "Halloween",
        buxcost: 2000,
        character: "artmajor",
        fid: 214,
        animations: [
            { element: "blinkeye", x: 43, y: 20, ftime: "0.25", loopdelay: [] },
            { element: "blinkeye", x: 37, y: 25, ftime: "0.25", loopdelay: [] },
            { element: "blinkeye", x: 41, y: 32, ftime: "0.25", loopdelay: [] },
            { element: "spookcandle", x: 92, y: 26, additive: true, ftime: "0.1" },
            { element: "spookcandle", x: 112, y: 26, additive: true, ftime: "0.15" },
            { element: "spiderdrop", x: 59, y: 17, ftime: "0.08", loopdelay: [] },
            { element: "lodgefire", x: 100, y: 40, ftime: "0.2" },
        ],
    },
    {
        name: "Waterpark Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 215,
        animations: [{ element: "lobbyslide", x: 54, y: 26, ftime: "0.1" }],
    },
    {
        name: "Tree Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 216,
        animations: [{ element: "glow", x: 30, y: 21, additive: true, ftime: "0.155", startframe: 3 }],
    },
    {
        name: "Monster Lobby",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 217,
        animations: [
            { element: "monstercomp", x: 96, y: 34, ftime: "0.05" },
            { element: "monsterholo", x: 56, y: 41, additive: true, ftime: "0.025" },
        ],
    },
    {
        name: "Holiday Lobby",
        type: FloorType.Lobby,
        holiday: "The Holidays",
        buxcost: 2000,
        character: "artmajor",
        fid: 218,
        animations: [
            { element: "xmaslobbytree", x: 0, y: 47, ftime: "0.5" },
            { element: "xmaslobbylights", x: 0, y: 47, ftime: "0.5" },
        ],
    },
    { name: "Corner Apts.", type: FloorType.Residential },
    {
        name: "Warren Buffet",
        type: FloorType.Food,
        animations: [{ element: "spookcandle", x: 7, y: 38, additive: true, ftime: "0.1" }],
    },
    { name: "Boxing Gym", type: FloorType.Entertainment },
    { name: "Emperor Apts.", type: FloorType.Residential },
    { name: "Joey Bitton", type: FloorType.Retail },
    {
        name: "Penthouse Apts.",
        type: FloorType.Residential,
        animations: [{ element: "pentfire", x: 85, y: 43, ftime: "0.2" }],
    },
    { name: "College", type: FloorType.Service },
    { name: "Dance Studio", type: FloorType.Creative },
    {
        name: "Legit Watches",
        type: FloorType.Retail,
        animations: [
            { element: "watch", x: 65, y: 24, ftime: "1" },
            { element: "tvcar", x: 9, y: 20, ftime: "0.2", startframe: 5 },
        ],
    },
    { name: "Lotus House", type: FloorType.Food },
    {
        name: "Tiger Magic",
        type: FloorType.Entertainment,
        animations: [{ element: "tigeranim", x: 92, y: 30, ftime: "0.18", loopdelay: [] }],
    },
    { name: "Bubblesoak Apts.", type: FloorType.Residential },
    { name: "Pop Art Apts.", type: FloorType.Residential },
    {
        name: "Lodge Apts.",
        type: FloorType.Residential,
        animations: [{ element: "lodgefire", x: 84, y: 43, ftime: "0.2" }],
    },
    {
        name: "Style Salon",
        type: FloorType.Service,
        animations: [{ element: "salonlights", x: 8, y: 7, cyclecolor: "16", additive: true }],
    },
    {
        name: "Superhero Lab",
        type: FloorType.Creative,
        animations: [
            { element: "dna", x: 61, y: 33, ftime: "0.25" },
            { element: "holo", x: 7, y: 33, ftime: "0.1" },
            { element: "lcd", x: 114, y: 36, ftime: "0.1" },
            { element: "globe", x: 82, y: 39, ftime: "0.1", additive: true },
        ],
    },
    { name: "Native Art Studio", type: FloorType.Creative },
    { name: "Tailor", type: FloorType.Service },
    {
        name: "Moroccan Cuisine",
        type: FloorType.Food,
        animations: [
            { element: "spookcandle", x: 12, y: 37, additive: true, ftime: "0.1" },
            { element: "spookcandle", x: 118, y: 37, additive: true, ftime: "0.1" },
        ],
    },
    {
        name: "Candy Shoppe",
        type: FloorType.Retail,
        stocktime: 30,
        animations: [
            { element: "pole", x: 27, y: 41, ftime: "0.2" },
            { element: "pole", x: 50, y: 41, ftime: "0.2" },
        ],
    },
    { name: "Wax Museum", type: FloorType.Entertainment },
    {
        name: "Cupid Apts.",
        type: FloorType.Residential,
        animations: [
            { element: "lodgefire", x: 4, y: 43, ftime: "0.2" },
            { element: "bubblebath", x: 106, y: 40, ftime: "0.2" },
            { element: "spookcandle", x: 0, y: 27, additive: true, ftime: "0.1", startframe: 3 },
            { element: "spookcandle", x: 17, y: 27, additive: true, ftime: "0.1", startframe: 5 },
            { element: "spookcandle", x: 22, y: 47, additive: true, ftime: "0.1", startframe: 2 },
            { element: "spookcandle", x: 119, y: 47, additive: true, ftime: "0.1", startframe: 4 },
            { element: "spookcandle", x: 115, y: 37, additive: true, ftime: "0.1", startframe: 1 },
        ],
    },
    {
        name: "Groovy Apts.",
        type: FloorType.Residential,
        animations: [
            { element: "waterlamp", x: 54, y: 45, ftime: "0.25" },
            { element: "waterlamp", x: 113, y: 45, ftime: "0.25", startframe: 3 },
        ],
    },
    { name: "Island Apts.", type: FloorType.Residential },
    {
        name: "Rock Diner",
        type: FloorType.Food,
        animations: [
            { element: "rockscreena", x: 70, y: 21, ftime: "0.5" },
            { element: "rockscreenb", x: 97, y: 21, ftime: "0.3" },
            { element: "rockscreenc", x: 126, y: 21, ftime: "0.6" },
        ],
    },
    {
        name: "Bling Jewelers",
        type: FloorType.Retail,
        stocktime: 60,
        animations: [
            { element: "jewelstanda", x: 56, y: 30, ftime: "0.2" },
            { element: "jewelstandb", x: 112, y: 30, ftime: "0.2" },
            { element: "glint", x: 7, y: 15, ftime: "0.1", additive: true, loopdelay: [] },
            { element: "glint", x: 13, y: 18, ftime: "0.1", additive: true, loopdelay: [] },
        ],
    },
    {
        name: "Creative Ink",
        type: FloorType.Creative,
        animations: [
            { element: "ink", x: 33, y: 11, ftime: "0.7" },
            { element: "fan", x: 57, y: 9, ftime: "0.025" },
        ],
    },
    { name: "Device Repair", type: FloorType.Service, animations: [{ element: "bittv", x: 2, y: 20, ftime: "0.1" }] },
    {
        name: "Splash Zone",
        type: FloorType.Entertainment,
        animations: [{ element: "pool", x: 78, y: 45, ftime: "0.25" }],
    },
    {
        name: "Dragon Apts.",
        type: FloorType.Residential,
        animations: [
            { element: "glow", x: 5, y: 31, additive: true, ftime: "0.15", startframe: 2 },
            { element: "glow", x: 87, y: 31, additive: true, ftime: "0.15", startframe: 1 },
        ],
    },
    {
        name: "Contempo Apts.",
        type: FloorType.Residential,
        animations: [{ element: "moderntv", x: 63, y: 31, ftime: "0.15" }],
    },
    {
        name: "Piano Apts.",
        type: FloorType.Residential,
        animations: [
            { element: "pianofire", x: 106, y: 42, ftime: "0.15" },
            { element: "spookcandle", x: 70, y: 18, additive: true, ftime: "0.13", startframe: 3 },
            { element: "spookcandle", x: 76, y: 17, additive: true, ftime: "0.13", startframe: 5 },
            { element: "spookcandle", x: 82, y: 18, additive: true, ftime: "0.13", startframe: 2 },
        ],
    },
    { name: "Shrimp Buffet", type: FloorType.Food },
    { name: "Law Offices", type: FloorType.Service },
    { name: "Broadway Theatre", type: FloorType.Entertainment },
    { name: "Tourist Trap", type: FloorType.Retail },
    { name: "Metal Studio", type: FloorType.Creative },
    { name: "Carmine Apts.", type: FloorType.Residential },
    {
        name: "Relax Apts.",
        type: FloorType.Residential,
        animations: [
            { element: "spookcandle", x: 95, y: 40, additive: true, ftime: "0.1", startframe: 3, frontlayer: 1 },
            { element: "spookcandle", x: 48, y: 47, additive: true, ftime: "0.1", startframe: 5 },
            { element: "spookcandle", x: 82, y: 47, additive: true, ftime: "0.1", startframe: 2 },
        ],
    },
    { name: "Regal Apts.", type: FloorType.Residential },
    { name: "Makerspace", type: FloorType.Creative },
    { name: "Indoor Skydiving", type: FloorType.Entertainment },
    { name: "Burrito Bar", type: FloorType.Food },
    { name: "Brick Store", type: FloorType.Retail },
    { name: "BitBook", type: FloorType.Service },
    { name: "Springfield Apts.", type: FloorType.Residential },
    { name: "Camping Apts.", type: FloorType.Residential },
    { name: "Capsule Apts.", type: FloorType.Residential },
    { name: "Doggy Daycare", type: FloorType.Service },
    { name: "Skate Shop", type: FloorType.Retail },
    { name: "Cookie Shop", type: FloorType.Food },
    { name: "Space Museum", type: FloorType.Entertainment },
    { name: "Model Trains", type: FloorType.Creative },
    { name: "Bitcraft Apts.", type: FloorType.Residential },
    { name: "Butterfly Apts.", type: FloorType.Residential },
    { name: "Cavern Apts.", type: FloorType.Residential },
    { name: "Garage Apts.", type: FloorType.Residential },
    { name: "VOTE! Lobby", type: FloorType.Lobby, buxcost: 100, character: "artmajor", fid: 276 },
    {
        name: "Easter Lobby",
        type: FloorType.Lobby,
        buxcost: 9999,
        hidden: true,
        character: "artmajor",
        fid: 277,
        animations: [
            { element: "bunnycounter", x: 0, y: 46, ftime: "0.25", loopdelay: [] },
            { element: "floor277grass", x: 0, y: 46, ftime: "0.125", loopdelay: [] },
        ],
    },
    {
        name: "Museum Lobby",
        holiday: "Independence Day",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        fid: 278,
    },
    {
        name: "Celebration Lobby",
        type: FloorType.Lobby,
        holiday: "Independence Day",
        buxcost: 1000,
        character: "artmajor",
        fid: 279,
    },
    {
        name: "Beach barbecue",
        type: FloorType.Lobby,
        holiday: "Summer",
        buxcost: 1000,
        character: "artmajor",
        fid: 280,
        animations: [{ element: "floor280smoke", x: 88, y: 34, ftime: "0.125" }],
    },
    {
        name: "Surfer paradise",
        type: FloorType.Lobby,
        buxcost: 9999,
        hidden: true,
        character: "artmajor",
        fid: 281,
        animations: [
            { element: "floor281torch", x: 60, y: 37, ftime: "0.125" },
            { element: "floor281surfer", x: 73, y: 48, ftime: "0.125" },
        ],
    },
    {
        name: "torture chamber",
        type: FloorType.Lobby,
        buxcost: 9999,
        hidden: true,
        character: "artmajor",
        fid: 282,
        animations: [
            { element: "floor282torch", x: 13, y: 28, ftime: "0.07" },
            { element: "floor282cage", x: 54, y: 43, ftime: "1.5" },
        ],
    },
    {
        name: "witch's chamber",
        type: FloorType.Lobby,
        holiday: "Halloween",
        buxcost: 1000,
        character: "artmajor",
        fid: 283,
        animations: [
            { element: "floor283pot", x: 92, y: 47, ftime: "0.125" },
            { element: "floor283cat", x: 117, y: 47, ftime: "1" },
            { element: "floor283spark", x: 23, y: 34, ftime: "0.07" },
            { element: "floor283candle", x: 9, y: 9, ftime: "0.5" },
            { element: "floor283book", x: 74, y: 31, ftime: "0.25" },
        ],
    },
    { name: "christmas market", type: FloorType.Lobby, buxcost: 9999, hidden: true, character: "artmajor", fid: 284 },
    {
        name: "santa claus office",
        type: FloorType.Lobby,
        holiday: "The Holidays",
        buxcost: 1000,
        character: "artmajor",
        fid: 285,
        animations: [{ element: "floor285anim", x: 47, y: 47, ftime: "0.125" }],
    },
    {
        name: "Legendary Lounge",
        type: FloorType.VIPLounge,
        animations: [
            { element: "floor286_star", x: 7, y: 35, ftime: "0.125", startdelay: "1.75", loopdelay: [] },
            { element: "floor286_wall", x: 54, y: 46, ftime: "0.125", loopdelay: [] },
            { element: "floor286_aquarium", x: 71, y: 32, ftime: "0.2" },
        ],
    },
    {
        name: "Washington Crossing",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        hidden: true,
        fid: 287,
        animations: [{ element: "floor287_boat", x: 70, y: 45, ftime: "0.125" }],
    },
    {
        name: "Ice Cream Parlor",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        hidden: true,
        fid: 288,
        animations: [{ element: "floor288_mixer", x: 57, y: 45, ftime: "0.125" }],
    },
    {
        name: "Backdoor Icy Cart",
        type: FloorType.Lobby,
        buxcost: 1000,
        character: "artmajor",
        holiday: "IceCream",
        fid: 289,
        animations: [
            { element: "floor289_white", x: 23, y: 46, ftime: "0.125" },
            { element: "floor289_black", x: 98, y: 38, ftime: "0.125" },
        ],
    },
] as const;
export type Floor = (typeof floors)[number];
