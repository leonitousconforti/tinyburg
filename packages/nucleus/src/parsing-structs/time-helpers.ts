// The TinyTower app is coded in unity and thus uses C#/.Net for the language.
// When using anything to do with time, such as the last sale ticks (lst) property
// for the floors, they use the DateTime.UTCNow.Ticks static field in C#.
//
// "A single tick represents one hundred nanoseconds or one ten-millionth of a second.
// There are 10,000 ticks in a millisecond (see TicksPerMillisecond) and 10 million ticks
// in a second. The value of this property represents the number of 100-nanosecond intervals
// that have elapsed since 12:00:00 midnight, January 1, 0001 in the Gregorian calendar"
// https://docs.microsoft.com/en-us/dotnet/api/system.datetime.ticks?view=net-6.0
const cSharpTicksPerMillisecond = 10_000n;
const cSharpTicksSinceBeginningOfCentury = 621_355_968_000_000_000n;

export const ticksToJsDate = (cSharpTicks: bigint): Date => {
    const jsEquivalentMilliseconds = (cSharpTicks - cSharpTicksSinceBeginningOfCentury) / cSharpTicksPerMillisecond;
    return new Date(Number(jsEquivalentMilliseconds));
};

export const jsDateToTicks = (date: Date = new Date()): bigint => {
    const jsEquivalentTicks = BigInt(date.getTime()) * cSharpTicksPerMillisecond;
    return jsEquivalentTicks + cSharpTicksSinceBeginningOfCentury;
};

// Some test data
// 637841386679615130
// 3/29/22 03:17:48
