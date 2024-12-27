/**
 * This file was auto-generated by a frida agent
 *
 * Generated by:
 * /workspaces/tinyburg/packages/insight/dist/src/agents/get-bitizen-data.js
 *
 * With TinyTower version: 5.2.1
 *
 * On: Wed, 08 May 2024 23:36:10 GMT
 */

export const numberHairAccessories = 3 as const;
export const numberGlasses = 9 as const;
export const numberFemaleHats = 2 as const;
export const numberMaleHats = 1 as const;
export const numberBiHats = 17 as const;

export const hairColors = [
    { r: 255, g: 191, b: 9 },
    { r: 46, g: 37, b: 35 },
    { r: 167, g: 167, b: 167 },
    { r: 66, g: 48, b: 43 },
    { r: 103, g: 57, b: 37 },
    { r: 122, g: 60, b: 41 },
    { r: 114, g: 74, b: 51 },
    { r: 180, g: 118, b: 75 },
    { r: 164, g: 111, b: 78 },
    { r: 127, g: 84, b: 59 },
    { r: 31, g: 37, b: 50 },
    { r: 191, g: 138, b: 93 },
    { r: 102, g: 51, b: 37 },
    { r: 67, g: 43, b: 30 },
    { r: 95, g: 64, b: 49 },
    { r: 255, g: 255, b: 255 },
    { r: 93, g: 59, b: 64 },
    { r: 105, g: 65, b: 79 },
    { r: 146, g: 64, b: 50 },
    { r: 111, g: 56, b: 49 },
    { r: 255, g: 200, b: 147 },
    { r: 255, g: 0, b: 255 },
    { r: 60, g: 255, b: 0 },
    { r: 0, g: 198, b: 255 },
    { r: 255, g: 88, b: 60 },
    { r: 102, g: 78, b: 74 },
    { r: 184, g: 111, b: 76 },
    { r: 174, g: 91, b: 51 },
    { r: 134, g: 25, b: 18 },
    { r: 49, g: 25, b: 25 },
    { r: 216, g: 192, b: 120 },
    { r: 227, g: 204, b: 136 },
    { r: 242, g: 255, b: 174 },
    { r: 242, g: 231, b: 199 },
    { r: 168, g: 72, b: 48 },
    { r: 120, g: 0, b: 0 },
    { r: 230, g: 226, b: 213 },
    { r: 72, g: 0, b: 0 },
    { r: 184, g: 145, b: 112 },
    { r: 194, g: 157, b: 130 },
    { r: 229, g: 198, b: 141 },
    { r: 255, g: 242, b: 168 },
    { r: 146, g: 110, b: 94 },
    { r: 158, g: 77, b: 10 },
    { r: 237, g: 194, b: 130 },
    { r: 255, g: 246, b: 223 },
    { r: 220, g: 160, b: 0 },
    { r: 205, g: 108, b: 3 },
    { r: 242, g: 166, b: 94 },
] as const;
export type HairColor = (typeof hairColors)[number];

export const skinColors = [
    { r: 227, g: 159, b: 148 },
    { r: 239, g: 178, b: 150 },
    { r: 182, g: 110, b: 86 },
    { r: 244, g: 194, b: 170 },
    { r: 246, g: 209, b: 175 },
    { r: 197, g: 157, b: 121 },
    { r: 171, g: 114, b: 86 },
    { r: 126, g: 84, b: 64 },
] as const;
export type SkinColor = (typeof skinColors)[number];

export const maleNames = [
    "James",
    "John",
    "Robert",
    "Michael",
    "William",
    "David",
    "Richard",
    "Charles",
    "Joseph",
    "Thomas",
    "Christopher",
    "Daniel",
    "Paul",
    "Mark",
    "Donald",
    "George",
    "Kenneth",
    "Steven",
    "Edward",
    "Brian",
    "Ronald",
    "Anthony",
    "Kevin",
    "Jason",
    "Matthew",
    "Gary",
    "Timothy",
    "Jose",
    "Larry",
    "Jeffrey",
    "Frank",
    "Scott",
    "Eric",
    "Stephen",
    "Andrew",
    "Raymond",
    "Gregory",
    "Joshua",
    "Jerry",
    "Dennis",
    "Walter",
    "Patrick",
    "Peter",
    "Harold",
    "Douglas",
    "Henry",
    "Carl",
    "Arthur",
    "Ryan",
    "Roger",
    "Joe",
    "Juan",
    "Jack",
    "Albert",
    "Jonathan",
    "Justin",
    "Terry",
    "Gerald",
    "Keith",
    "Samuel",
    "Willie",
    "Ralph",
    "Lawrence",
    "Nicholas",
    "Roy",
    "Benjamin",
    "Bruce",
    "Brandon",
    "Adam",
    "Harry",
    "Fred",
    "Wayne",
    "Billy",
    "Steve",
    "Louis",
    "Jeremy",
    "Aaron",
    "Randy",
    "Howard",
    "Eugene",
    "Carlos",
    "Russell",
    "Bobby",
    "Victor",
    "Martin",
    "Ernest",
    "Phillip",
    "Todd",
    "Jesse",
    "Craig",
    "Alan",
    "Shawn",
    "Clarence",
    "Sean",
    "Philip",
    "Chris",
    "Johnny",
    "Earl",
    "Jimmy",
    "Antonio",
    "Danny",
    "Bryan",
    "Tony",
    "Luis",
    "Mike",
    "Stanley",
    "Leonard",
    "Nathan",
    "Dale",
    "Manuel",
    "Rodney",
    "Curtis",
    "Norman",
    "Allen",
    "Marvin",
    "Vincent",
    "Glenn",
    "Jeffery",
    "Travis",
    "Jeff",
    "Chad",
    "Jacob",
    "Lee",
    "Melvin",
    "Alfred",
    "Kyle",
    "Francis",
    "Bradley",
    "Jesus",
    "Herbert",
    "Frederick",
    "Ray",
    "Joel",
    "Edwin",
    "Don",
    "Eddie",
    "Ricky",
    "Troy",
    "Randall",
    "Barry",
    "Alexander",
    "Bernard",
    "Mario",
    "Leroy",
    "Francisco",
    "Marcus",
    "Micheal",
    "Theodore",
    "Clifford",
    "Miguel",
    "Oscar",
    "Jay",
    "Jim",
    "Tom",
    "Calvin",
    "Alex",
    "Jon",
    "Ronnie",
    "Bill",
    "Lloyd",
    "Tommy",
    "Leon",
    "Derek",
    "Warren",
    "Darrell",
    "Jerome",
    "Floyd",
    "Leo",
    "Alvin",
    "Tim",
    "Wesley",
    "Gordon",
    "Dean",
    "Greg",
    "Jorge",
    "Dustin",
    "Pedro",
    "Derrick",
    "Dan",
    "Lewis",
    "Zachary",
    "Corey",
    "Herman",
    "Maurice",
    "Vernon",
    "Roberto",
    "Clyde",
    "Glen",
    "Hector",
    "Shane",
    "Ricardo",
    "Sam",
    "Rick",
    "Lester",
    "Brent",
    "Ramon",
    "Charlie",
    "Tyler",
    "Gilbert",
    "Gene",
    "Marc",
    "Reginald",
    "Ruben",
    "Brett",
    "Angel",
    "Nathaniel",
    "Rafael",
    "Leslie",
    "Edgar",
    "Milton",
    "Raul",
    "Ben",
    "Chester",
    "Cecil",
    "Duane",
    "Franklin",
    "Andre",
    "Elmer",
    "Brad",
    "Gabriel",
    "Ron",
    "Mitchell",
    "Roland",
    "Arnold",
    "Harvey",
    "Jared",
    "Adrian",
    "Karl",
    "Cory",
    "Claude",
    "Erik",
    "Darryl",
    "Jamie",
    "Neil",
    "Jessie",
    "Christian",
    "Javier",
    "Fernando",
    "Clinton",
    "Ted",
    "Mathew",
    "Tyrone",
    "Darren",
    "Lonnie",
    "Lance",
    "Cody",
    "Julio",
    "Kelly",
    "Kurt",
    "Allan",
    "Nelson",
    "Guy",
    "Clayton",
    "Hugh",
    "Max",
    "Dwayne",
    "Dwight",
    "Armando",
    "Felix",
    "Jimmie",
    "Everett",
    "Jordan",
    "Ian",
    "Wallace",
    "Ken",
    "Bob",
    "Jaime",
    "Casey",
    "Alfredo",
    "Alberto",
    "Dave",
    "Ivan",
    "Johnnie",
    "Sidney",
    "Byron",
    "Julian",
    "Isaac",
    "Morris",
    "Clifton",
    "Willard",
    "Daryl",
    "Ross",
    "Virgil",
    "Andy",
    "Marshall",
    "Salvador",
    "Perry",
    "Kirk",
    "Sergio",
    "Marion",
    "Tracy",
    "Seth",
    "Kent",
    "Terrance",
    "Rene",
    "Eduardo",
    "Terrence",
    "Enrique",
    "Freddie",
    "Wade",
] as const;
export type MaleName = (typeof maleNames)[number];

export const femaleNames = [
    "Mary",
    "Patricia",
    "Linda",
    "Barbara",
    "Elizabeth",
    "Jennifer",
    "Maria",
    "Susan",
    "Margaret",
    "Dorothy",
    "Lisa",
    "Nancy",
    "Karen",
    "Betty",
    "Helen",
    "Sandra",
    "Donna",
    "Carol",
    "Ruth",
    "Sharon",
    "Michelle",
    "Laura",
    "Sarah",
    "Kimberly",
    "Deborah",
    "Jessica",
    "Shirley",
    "Cynthia",
    "Angela",
    "Melissa",
    "Brenda",
    "Amy",
    "Anna",
    "Rebecca",
    "Virginia",
    "Kathleen",
    "Pamela",
    "Martha",
    "Debra",
    "Amanda",
    "Stephanie",
    "Carolyn",
    "Christine",
    "Marie",
    "Janet",
    "Catherine",
    "Frances",
    "Ann",
    "Joyce",
    "Diane",
    "Alice",
    "Julie",
    "Heather",
    "Teresa",
    "Doris",
    "Gloria",
    "Evelyn",
    "Jean",
    "Cheryl",
    "Mildred",
    "Katherine",
    "Joan",
    "Ashley",
    "Judith",
    "Rose",
    "Janice",
    "Kelly",
    "Nicole",
    "Judy",
    "Christina",
    "Kathy",
    "Theresa",
    "Beverly",
    "Denise",
    "Tammy",
    "Irene",
    "Jane",
    "Lori",
    "Rachel",
    "Marilyn",
    "Andrea",
    "Kathryn",
    "Louise",
    "Sara",
    "Anne",
    "Jacqueline",
    "Wanda",
    "Bonnie",
    "Julia",
    "Ruby",
    "Lois",
    "Tina",
    "Phyllis",
    "Norma",
    "Paula",
    "Diana",
    "Annie",
    "Lillian",
    "Emily",
    "Robin",
    "Peggy",
    "Crystal",
    "Gladys",
    "Rita",
    "Dawn",
    "Connie",
    "Florence",
    "Tracy",
    "Edna",
    "Tiffany",
    "Carmen",
    "Rosa",
    "Cindy",
    "Grace",
    "Wendy",
    "Victoria",
    "Edith",
    "Kim",
    "Sherry",
    "Sylvia",
    "Josephine",
    "Thelma",
    "Shannon",
    "Sheila",
    "Ethel",
    "Ellen",
    "Elaine",
    "Marjorie",
    "Carrie",
    "Charlotte",
    "Monica",
    "Esther",
    "Pauline",
    "Emma",
    "Juanita",
    "Anita",
    "Rhonda",
    "Hazel",
    "Amber",
    "Eva",
    "Debbie",
    "April",
    "Leslie",
    "Clara",
    "Lucille",
    "Jamie",
    "Joanne",
    "Eleanor",
    "Valerie",
    "Danielle",
    "Megan",
    "Alicia",
    "Suzanne",
    "Michele",
    "Gail",
    "Bertha",
    "Darlene",
    "Veronica",
    "Jill",
    "Erin",
    "Geraldine",
    "Lauren",
    "Cathy",
    "Joann",
    "Lorraine",
    "Lynn",
    "Sally",
    "Regina",
    "Erica",
    "Beatrice",
    "Dolores",
    "Bernice",
    "Audrey",
    "Yvonne",
    "Annette",
    "June",
    "Samantha",
    "Marion",
    "Dana",
    "Stacy",
    "Ana",
    "Renee",
    "Ida",
    "Vivian",
    "Roberta",
    "Holly",
    "Brittany",
    "Melanie",
    "Loretta",
    "Yolanda",
    "Jeanette",
    "Laurie",
    "Katie",
    "Kristen",
    "Vanessa",
    "Alma",
    "Sue",
    "Elsie",
    "Beth",
    "Jeanne",
    "Vicki",
    "Carla",
    "Tara",
    "Rosemary",
    "Eileen",
    "Terri",
    "Gertrude",
    "Lucy",
    "Tonya",
    "Ella",
    "Stacey",
    "Wilma",
    "Gina",
    "Kristin",
    "Jessie",
    "Natalie",
    "Agnes",
    "Vera",
    "Willie",
    "Charlene",
    "Bessie",
    "Delores",
    "Melinda",
    "Pearl",
    "Arlene",
    "Maureen",
    "Colleen",
    "Allison",
    "Tamara",
    "Joy",
    "Georgia",
    "Constance",
    "Lillie",
    "Claudia",
    "Jackie",
    "Marcia",
    "Tanya",
    "Nellie",
    "Minnie",
    "Marlene",
    "Heidi",
    "Glenda",
    "Lydia",
    "Viola",
    "Courtney",
    "Marian",
    "Stella",
    "Caroline",
    "Dora",
    "Jo",
    "Vickie",
    "Mattie",
    "Terry",
    "Maxine",
    "Irma",
    "Mabel",
    "Marsha",
    "Myrtle",
    "Lena",
    "Christy",
    "Deanna",
    "Patsy",
    "Hilda",
    "Gwendolyn",
    "Jennie",
    "Nora",
    "Margie",
    "Nina",
    "Cassandra",
    "Leah",
    "Penny",
    "Kay",
    "Priscilla",
    "Naomi",
    "Carole",
    "Brandy",
    "Olga",
    "Billie",
    "Dianne",
    "Tracey",
    "Leona",
    "Jenny",
    "Felicia",
    "Sonia",
    "Miriam",
    "Velma",
    "Becky",
    "Bobbie",
    "Violet",
    "Kristina",
    "Toni",
    "Misty",
    "Mae",
    "Shelly",
    "Daisy",
    "Ramona",
    "Sherri",
    "Erika",
    "Katrina",
    "Claire",
] as const;
export type FemaleName = (typeof femaleNames)[number];

export const maleLastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Jones",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson",
    "White",
    "Harris",
    "Martin",
    "Thompson",
    "Garcia",
    "Martinez",
    "Robinson",
    "Clark",
    "Rodriguez",
    "Lewis",
    "Lee",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "Hernandez",
    "King",
    "Wright",
    "Lopez",
    "Hill",
    "Scott",
    "Green",
    "Adams",
    "Baker",
    "Gonzalez",
    "Nelson",
    "Carter",
    "Mitchell",
    "Perez",
    "Roberts",
    "Turner",
    "Phillips",
    "Campbell",
    "Parker",
    "Evans",
    "Edwards",
    "Collins",
    "Stewart",
    "Sanchez",
    "Morris",
    "Rogers",
    "Reed",
    "Cook",
    "Morgan",
    "Bell",
    "Murphy",
    "Bailey",
    "Rivera",
    "Cooper",
    "Richardson",
    "Cox",
    "Howard",
    "Ward",
    "Torres",
    "Peterson",
    "Gray",
    "Ramirez",
    "James",
    "Watson",
    "Brooks",
    "Kelly",
    "Sanders",
    "Price",
    "Bennett",
    "Wood",
    "Barnes",
    "Ross",
    "Henderson",
    "Coleman",
    "Jenkins",
    "Perry",
    "Powell",
    "Long",
    "Patterson",
    "Hughes",
    "Flores",
    "Washington",
    "Butler",
    "Simmons",
    "Foster",
    "Gonzales",
    "Bryant",
    "Alexander",
    "Russell",
    "Griffin",
    "Diaz",
    "Hayes",
    "Myers",
    "Ford",
    "Hamilton",
    "Graham",
    "Sullivan",
    "Wallace",
    "Woods",
    "Cole",
    "West",
    "Jordan",
    "Owens",
    "Reynolds",
    "Fisher",
    "Ellis",
    "Harrison",
    "Gibson",
    "Mcdonald",
    "Cruz",
    "Marshall",
    "Ortiz",
    "Gomez",
    "Murray",
    "Freeman",
    "Wells",
    "Webb",
    "Simpson",
    "Stevens",
    "Tucker",
    "Porter",
    "Hunter",
    "Hicks",
    "Crawford",
    "Henry",
    "Boyd",
    "Mason",
    "Morales",
    "Kennedy",
    "Warren",
    "Dixon",
    "Ramos",
    "Reyes",
    "Burns",
    "Gordon",
    "Shaw",
    "Holmes",
    "Rice",
    "Robertson",
    "Hunt",
    "Black",
    "Daniels",
    "Palmer",
    "Mills",
    "Nichols",
    "Grant",
    "Knight",
    "Ferguson",
    "Rose",
    "Stone",
    "Hawkins",
    "Dunn",
    "Perkins",
    "Hudson",
    "Spencer",
    "Gardner",
    "Stephens",
    "Payne",
    "Pierce",
    "Berry",
    "Matthews",
    "Arnold",
    "Wagner",
    "Willis",
    "Ray",
    "Watkins",
    "Olson",
    "Carroll",
    "Duncan",
    "Snyder",
    "Hart",
    "Cunningham",
    "Bradley",
    "Lane",
    "Andrews",
    "Ruiz",
    "Harper",
    "Fox",
    "Riley",
    "Armstrong",
    "Carpenter",
    "Weaver",
    "Greene",
    "Lawrence",
    "Elliott",
    "Chavez",
    "Sims",
    "Austin",
    "Peters",
    "Kelley",
    "Franklin",
    "Lawson",
    "Fields",
    "Gutierrez",
    "Ryan",
    "Schmidt",
    "Carr",
    "Vasquez",
    "Castillo",
    "Wheeler",
    "Chapman",
    "Oliver",
    "Montgomery",
    "Richards",
    "Williamson",
    "Johnston",
    "Banks",
    "Meyer",
    "Bishop",
    "Mccoy",
    "Howell",
    "Alvarez",
    "Morrison",
    "Hansen",
    "Fernandez",
    "Garza",
    "Harvey",
    "Little",
    "Burton",
    "Stanley",
    "Nguyen",
    "George",
    "Jacobs",
    "Reid",
    "Kim",
    "Fuller",
    "Lynch",
    "Dean",
    "Gilbert",
    "Garrett",
    "Romero",
    "Welch",
    "Larson",
    "Frazier",
    "Burke",
    "Hanson",
    "Day",
    "Mendoza",
    "Moreno",
    "Bowman",
    "Medina",
    "Fowler",
    "Brewer",
    "Hoffman",
    "Carlson",
    "Silva",
    "Pearson",
    "Holland",
    "Douglas",
    "Fleming",
    "Jensen",
    "Vargas",
    "Byrd",
    "Davidson",
    "Hopkins",
    "May",
    "Terry",
    "Herrera",
    "Wade",
    "Soto",
    "Walters",
    "Curtis",
    "Neal",
    "Caldwell",
    "Lowe",
    "Jennings",
    "Barnett",
    "Graves",
    "Jimenez",
    "Horton",
    "Shelton",
    "Barrett",
    "Obrien",
    "Castro",
    "Sutton",
    "Gregory",
    "Mckinney",
    "Lucas",
    "Miles",
    "Craig",
    "Rodriquez",
    "Chambers",
    "Holt",
    "Lambert",
    "Fletcher",
    "Watts",
    "Bates",
    "Hale",
    "Rhodes",
    "Pena",
    "Beck",
    "Newman",
] as const;
export type MaleLastName = (typeof maleLastNames)[number];

export const femaleLastNames = [
    "Smith",
    "Johnson",
    "Williams",
    "Jones",
    "Brown",
    "Davis",
    "Miller",
    "Wilson",
    "Moore",
    "Taylor",
    "Anderson",
    "Thomas",
    "Jackson",
    "White",
    "Harris",
    "Martin",
    "Thompson",
    "Garcia",
    "Martinez",
    "Robinson",
    "Clark",
    "Rodriguez",
    "Lewis",
    "Lee",
    "Walker",
    "Hall",
    "Allen",
    "Young",
    "Hernandez",
    "King",
    "Wright",
    "Lopez",
    "Hill",
    "Scott",
    "Green",
    "Adams",
    "Baker",
    "Gonzalez",
    "Nelson",
    "Carter",
    "Mitchell",
    "Perez",
    "Roberts",
    "Turner",
    "Phillips",
    "Campbell",
    "Parker",
    "Evans",
    "Edwards",
    "Collins",
    "Stewart",
    "Sanchez",
    "Morris",
    "Rogers",
    "Reed",
    "Cook",
    "Morgan",
    "Bell",
    "Murphy",
    "Bailey",
    "Rivera",
    "Cooper",
    "Richardson",
    "Cox",
    "Howard",
    "Ward",
    "Torres",
    "Peterson",
    "Gray",
    "Ramirez",
    "James",
    "Watson",
    "Brooks",
    "Kelly",
    "Sanders",
    "Price",
    "Bennett",
    "Wood",
    "Barnes",
    "Ross",
    "Henderson",
    "Coleman",
    "Jenkins",
    "Perry",
    "Powell",
    "Long",
    "Patterson",
    "Hughes",
    "Flores",
    "Washington",
    "Butler",
    "Simmons",
    "Foster",
    "Gonzales",
    "Bryant",
    "Alexander",
    "Russell",
    "Griffin",
    "Diaz",
    "Hayes",
    "Myers",
    "Ford",
    "Hamilton",
    "Graham",
    "Sullivan",
    "Wallace",
    "Woods",
    "Cole",
    "West",
    "Jordan",
    "Owens",
    "Reynolds",
    "Fisher",
    "Ellis",
    "Harrison",
    "Gibson",
    "Mcdonald",
    "Cruz",
    "Marshall",
    "Ortiz",
    "Gomez",
    "Murray",
    "Freeman",
    "Wells",
    "Webb",
    "Simpson",
    "Stevens",
    "Tucker",
    "Porter",
    "Hunter",
    "Hicks",
    "Crawford",
    "Henry",
    "Boyd",
    "Mason",
    "Morales",
    "Kennedy",
    "Warren",
    "Dixon",
    "Ramos",
    "Reyes",
    "Burns",
    "Gordon",
    "Shaw",
    "Holmes",
    "Rice",
    "Robertson",
    "Hunt",
    "Black",
    "Daniels",
    "Palmer",
    "Mills",
    "Nichols",
    "Grant",
    "Knight",
    "Ferguson",
    "Rose",
    "Stone",
    "Hawkins",
    "Dunn",
    "Perkins",
    "Hudson",
    "Spencer",
    "Gardner",
    "Stephens",
    "Payne",
    "Pierce",
    "Berry",
    "Matthews",
    "Arnold",
    "Wagner",
    "Willis",
    "Ray",
    "Watkins",
    "Olson",
    "Carroll",
    "Duncan",
    "Snyder",
    "Hart",
    "Cunningham",
    "Bradley",
    "Lane",
    "Andrews",
    "Ruiz",
    "Harper",
    "Fox",
    "Riley",
    "Armstrong",
    "Carpenter",
    "Weaver",
    "Greene",
    "Lawrence",
    "Elliott",
    "Chavez",
    "Sims",
    "Austin",
    "Peters",
    "Kelley",
    "Franklin",
    "Lawson",
    "Fields",
    "Gutierrez",
    "Ryan",
    "Schmidt",
    "Carr",
    "Vasquez",
    "Castillo",
    "Wheeler",
    "Chapman",
    "Oliver",
    "Montgomery",
    "Richards",
    "Williamson",
    "Johnston",
    "Banks",
    "Meyer",
    "Bishop",
    "Mccoy",
    "Howell",
    "Alvarez",
    "Morrison",
    "Hansen",
    "Fernandez",
    "Garza",
    "Harvey",
    "Little",
    "Burton",
    "Stanley",
    "Nguyen",
    "George",
    "Jacobs",
    "Reid",
    "Kim",
    "Fuller",
    "Lynch",
    "Dean",
    "Gilbert",
    "Garrett",
    "Romero",
    "Welch",
    "Larson",
    "Frazier",
    "Burke",
    "Hanson",
    "Day",
    "Mendoza",
    "Moreno",
    "Bowman",
    "Medina",
    "Fowler",
    "Brewer",
    "Hoffman",
    "Carlson",
    "Silva",
    "Pearson",
    "Holland",
    "Douglas",
    "Fleming",
    "Jensen",
    "Vargas",
    "Byrd",
    "Davidson",
    "Hopkins",
    "May",
    "Terry",
    "Herrera",
    "Wade",
    "Soto",
    "Walters",
    "Curtis",
    "Neal",
    "Caldwell",
    "Lowe",
    "Jennings",
    "Barnett",
    "Graves",
    "Jimenez",
    "Horton",
    "Shelton",
    "Barrett",
    "Obrien",
    "Castro",
    "Sutton",
    "Gregory",
    "Mckinney",
    "Lucas",
    "Miles",
    "Craig",
    "Rodriquez",
    "Chambers",
    "Holt",
    "Lambert",
    "Fletcher",
    "Watts",
    "Bates",
    "Hale",
    "Rhodes",
    "Pena",
    "Beck",
    "Newman",
] as const;
export type FemaleLastName = (typeof femaleLastNames)[number];
