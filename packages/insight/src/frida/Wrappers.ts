import "frida-il2cpp-bridge";

import { Array } from "effect";

export class Dictionary<
    K extends Il2Cpp.Field.Type = Il2Cpp.Field.Type,
    V extends Il2Cpp.Field.Type = Il2Cpp.Field.Type,
>
    extends Il2Cpp.Object
{
    /** Gets the pairs count of the current dictionary. */
    public get length(): number {
        return this.method<number>("get_Count").invoke();
    }

    /** Gets all keys of the current dictionary. */
    public get keys(): Array<K> {
        const keys = Il2Cpp.array<K>(this.class.generics[0], this.length);
        this.method<Il2Cpp.Object>("get_Keys").invoke().method("CopyTo").invoke(keys, 0);
        return Array.fromIterable(keys);
    }

    /** Gets all values of the current dictionary. */
    public get values(): Array<V> {
        const values = Il2Cpp.array<V>(this.class.generics[1], this.length);
        this.method<Il2Cpp.Object>("get_Values").invoke().method("CopyTo").invoke(values, 0);
        return Array.fromIterable(values);
    }

    /** Gets all pairs of the current dictionary. */
    public get entries(): Array<[K, V]> {
        return Array.zip(this.keys, this.values);
    }

    /** Gets the value by the specified key of the current dictionary. */
    public get(key: K): V {
        return this.method<V>("get_Item").invoke(key);
    }

    /** Sets the pair of the current dictionary. */
    public set(key: K, value: V): void {
        this.method<void>("set_Item").invoke(key, value);
    }

    /** Adds a new key to the current dictionary. */
    public add(key: K, value: V): void {
        this.method<void>("Add").invoke(key, value);
    }

    /** Clears the current dictionary. */
    public clear(): void {
        this.method<void>("Clear").invoke();
    }

    /** Determines if the key is in the current dictionary. */
    public containsKey(key: K): boolean {
        return this.method<boolean>("ContainsKey").invoke(key);
    }

    /** Determines if the value is in the current dictionary. */
    public containsValue(value: V): boolean {
        return this.method<boolean>("ContainsValue").invoke(value);
    }

    /** Finds a key in the current dictionary and returns its index. */
    public find(key: K): number {
        return this.method<number>("FindEntry").invoke(key);
    }

    /** Removes the given key from the current dictionary. */
    public remove(key: K): boolean {
        return this.method<boolean>("Remove").invoke(key);
    }

    public *[Symbol.iterator](): IterableIterator<[K, V]> {
        const entries = this.entries;
        for (let i = 0; i < this.length; i++) {
            yield entries[i];
        }
    }

    public override toString(): string {
        return this.isNull() ? "null" : `{${[...this.entries].map(([k, v]) => `${k}: ${v}`).join(", ")}}`;
    }

    /** Lifts an Il2Cpp.Object to a Dictionary. */
    public static lift<
        K extends Il2Cpp.Field.Type = Il2Cpp.Field.Type,
        V extends Il2Cpp.Field.Type = Il2Cpp.Field.Type,
    >(object: Il2Cpp.Object): Dictionary<K, V> {
        return new Dictionary<K, V>(object.handle);
    }

    /** Lifts a Nimblebit DSO to a Dictionary. */
    public static liftNimblebitDSO(object: Il2Cpp.Object): Dictionary<Il2Cpp.String, Il2Cpp.Object> {
        const dictionary = Dictionary.lift<Il2Cpp.String, Il2Cpp.Object>(object);
        dictionary.class.generics[0] = Il2Cpp.corlib.class("System.String");
        dictionary.class.generics[1] = Il2Cpp.corlib.class("System.Object");
        return dictionary;
    }

    /** Creates a new dictionary with the given elements. */
    public static of<K extends Il2Cpp.Field.Type = Il2Cpp.Field.Type, V extends Il2Cpp.Field.Type = Il2Cpp.Field.Type>(
        keyClass: Il2Cpp.Class,
        valueClass: Il2Cpp.Class,
        elements?: Map<K, V> | undefined
    ): Dictionary<K, V> {
        const dictionary = new Dictionary<K, V>(
            Il2Cpp.corlib.class("System.Collections.Generic.Dictionary`2").inflate(keyClass, valueClass).alloc()
        );

        for (const [key, value] of elements ?? []) {
            dictionary.set(key, value);
        }

        return dictionary;
    }
}

export class List<T extends Il2Cpp.Field.Type = Il2Cpp.Field.Type> extends Il2Cpp.Object {
    public get capacity(): number {
        return this.method<number>("get_Capacity").invoke();
    }

    public set capacity(value: number) {
        this.method("set_Capacity").invoke(value);
    }

    /** Gets the element count of the current list. */
    public get length(): number {
        return this.method<number>("get_Count").invoke();
    }

    /** Gets the value by the specified index of the current list. */
    public get(index: number): T {
        return this.method<T>("get_Item").invoke(index);
    }

    /** Sets the element of the current list. */
    public set(index: number, value: T): void {
        this.method("set_Item").invoke(index, value);
    }

    /** Adds a new element to the current list. */
    public add(item: T): void {
        this.method("Add").invoke(item);
    }

    /** Clears the current list. */
    public clear(): void {
        this.method("Clear").invoke();
    }

    /** Determines if the key is in the current list. */
    public contains(item: T): boolean {
        return this.method<boolean>("Contains").invoke(item);
    }

    /** Determines the index of the element of the current list. */
    public indexOf(item: T): number {
        return this.method<number>("IndexOf").invoke(item);
    }

    /** Inserts an element at the given index of the current list. */
    public insert(index: number, item: T): void {
        this.method("Insert").invoke(index, item);
    }

    /** Removes a data element from the current list. */
    public remove(item: T): boolean {
        return this.method<boolean>("Remove").invoke(item);
    }

    /** Reverses the current list. */
    public reverse(): void {
        this.method("Reverse").invoke();
    }

    /** Sorts the current list. */
    public sort(): void {
        this.method("Sort").invoke();
    }

    /** Converts the current list to an array. */
    public get toArray(): Il2Cpp.Array<T> {
        return this.method<Il2Cpp.Array<T>>("ToArray").invoke();
    }

    public *[Symbol.iterator](): IterableIterator<T> {
        for (let i = 0; i < this.length; i++) {
            yield this.get(i);
        }
    }

    public override toString(): string {
        return this.toArray.toString();
    }

    /** Lifts an Il2Cpp.Array to a List. */
    public static lift<T extends Il2Cpp.Field.Type = Il2Cpp.Field.Type>(object: Il2Cpp.Object): List<T> {
        return new List<T>(object.handle);
    }

    /** Creates a new list with the given elements. */
    public static of<T extends Il2Cpp.Field.Type = Il2Cpp.Field.Type>(
        klass: Il2Cpp.Class,
        elements: Array<T> | undefined = []
    ): List<T> {
        const list = new List<T>(Il2Cpp.corlib.class("System.Collections.Generic.List`1").inflate(klass).alloc());

        for (const element of elements) {
            list.add(element);
        }

        return list;
    }
}
