import "frida-il2cpp-bridge";

// Fix for https://github.com/vfsfitvnm/frida-il2cpp-bridge/issues/264#issuecomment-1490798519
(globalThis as any).Module = new Proxy(Module, {
    cache: {},

    get(target: typeof Module, property: string | symbol): NativePointer | undefined {
        const patchedFindExportByName = (moduleName: string | null, exportName: string) => {
            if (moduleName === null) {
                return Reflect.get(target, property)(moduleName, exportName);
            }
            this.cache[moduleName] ??= (Module as any).enumerateExports(moduleName);
            return this.cache[moduleName]!.find((module: ModuleExportDetails) => module.name === exportName)?.address;
        };
        return property === "findExportByName" ? patchedFindExportByName : Reflect.get(target, property);
    },
} as ProxyHandler<typeof Module> & { cache: Record<string, Array<ModuleExportDetails>> });

/**
 * A dependency can be either an entire c# assembly, a single class, a
 * static/non-static object in a class, a field on a class or a method on a
 * class.
 */
export type Dependency = Il2Cpp.Assembly | Il2Cpp.Class | Il2Cpp.Object | Il2Cpp.Field | Il2Cpp.Method | Il2Cpp.Array;

/**
 * If the class has static fields that need to be initialized as well, the
 * static constructor on the class can be called by setting the
 * callStaticConstructor in the dependencies metadata field.
 *
 * @see https://learn.microsoft.com/en-us/dotnet/csharp/programming-guide/classes-and-structs/static-constructors
 */
export interface IDependenciesMeta {
    callStaticConstructor?: boolean;
}

/**
 * A dependency loader is a function that returns a map of names to
 * dependencies. The dependencies will be made available in the retrieve data
 * method using their names from this map. A value in this map can be either
 * just the {@link Dependency|dependency} or an object with a dependency field
 * and a {@link IDependenciesMeta|metadata} field.
 */
export type DependencyLoader = () => { [k: string]: Dependency | { dependency: Dependency; meta: IDependenciesMeta } };

/** These two methods are required for all agents */
export interface ITinyTowerFridaAgent {
    loadDependencies: DependencyLoader;
    retrieveData: () => unknown;
}

/**
 * Base Frida agent that handles retrying when loading dependencies and
 * communicating with the other side of the application.
 */
export abstract class TinyTowerFridaAgent<T extends ITinyTowerFridaAgent> {
    /**
     * Time to wait (in milliseconds) after the dependencies failed to load
     * before retrying.
     */
    private readonly _loadDependenciesWaitMs: number;

    /**
     * Maximum number of times to retry loading the dependencies before giving
     * up and throwing an error.
     */
    private readonly _loadDependenciesMaxRetries: number;

    /**
     * Any dependencies returned from the loadDependencies method will be
     * exposed in this field to any other method of the class, assuming that
     * they all loaded correctly.
     */
    public dependencies: ReturnType<T["loadDependencies"]>;

    /**
     * The data returned from the retrieveData method will be exposed in this
     * field to any other method in the class, assuming that there was no error
     * when getting the data.
     */
    public data: ReturnType<T["retrieveData"]>;

    public constructor(loadDependenciesMaxRetries: number = 5, loadDependenciesWaitMs: number = 5000) {
        this._loadDependenciesWaitMs = loadDependenciesWaitMs;
        this._loadDependenciesMaxRetries = loadDependenciesMaxRetries;
        this.data = {} as ReturnType<T["retrieveData"]>;
        this.dependencies = {} as ReturnType<T["loadDependencies"]>;
    }

    /**
     * A synchronous method that returns an object of the
     * {@link Dependency|dependencies} to be used in any other method. Other
     * methods have access to the dependencies via this.dependencies, which has
     * the return type of this method. This method might be called multiple
     * times until all the items in the object are non-null, which indicates
     * that they are properly loaded, or until the load dependencies max retries
     * value is reached at which point an error will be thrown that not all
     * dependencies could be loaded.
     *
     * @see {@link DependencyLoader}
     */
    public abstract loadDependencies(): ReturnType<T["loadDependencies"]>;

    /**
     * A synchronous method that retrieves the desired data from the application
     * using frida and frida-il2cpp-bridge.
     */
    public abstract retrieveData(): ReturnType<T["retrieveData"]>;

    /**
     * Kicks starts the frida agent by trying to load the dependencies through
     * the loadDependencies method. Once the dependencies are properly loaded,
     * calls the retrieveData method.
     */
    public async start(): Promise<this> {
        // Wrap all this in an Il2cpp.perform
        await Il2Cpp.perform(async () => {
            // Try to load the dependencies
            this.dependencies = await this._waitForDependencies(
                this.loadDependencies,
                this._loadDependenciesMaxRetries,
                this._loadDependenciesWaitMs
            );

            // Invoke the retrieveData method
            this.data = this.retrieveData();
        }, "bind");

        return this;
    }

    /**
     * Waits for all the dependencies from the dependency loader method to be
     * non-null. If one or more of the dependencies fails to load, then a retry
     * is performed after a set amount of time. If all the dependencies have not
     * properly loaded after the maximum number of retries then an error will be
     * thrown. This method is recursive and uses the retries parameter to track
     * how many retries it has left.
     *
     * @param dependencyLoader - The dependency loader function to call
     * @param retries - Base case for recursion, when retries is less than or
     *   equal to zero an error will be thrown because not all dependencies
     *   could be loaded after the specified number of retries.
     * @param waitMs - How long to wait, in milliseconds, after failing to load
     *   some dependencies from the dependencyLoader.
     * @returns - The successfully loaded dependencies
     */
    private async _waitForDependencies<T extends DependencyLoader>(
        dependencyLoader: T,
        retries: number,
        waitMs: number
    ): Promise<ReturnType<T>> {
        // Wrap in a try-catch, don't want errors to bubble up because there might
        // be the opportunity to retry.
        try {
            // Call the dependency loader function
            const dependencies = dependencyLoader();
            const dependencyEntries = Object.entries(dependencies);

            // Makes all dependencies into [Dependency, IDependenciesMeta | undefined]
            const justDependencies = dependencyEntries.map(([__name, dep]) =>
                dep instanceof Il2Cpp.Assembly ||
                dep instanceof Il2Cpp.Class ||
                dep instanceof Il2Cpp.Object ||
                dep instanceof Il2Cpp.Method ||
                dep instanceof Il2Cpp.Field ||
                dep instanceof Il2Cpp.Array
                    ? ([dep] as const)
                    : ([dep.dependency, dep.meta] as const)
            );

            // Get all the class dependencies, will need to check for callStaticConstructor
            const classDependencies = justDependencies.filter(([dep]) => dep instanceof Il2Cpp.Class);

            // If all dependencies did not load successfully
            if (!justDependencies.every(([dep]) => !dep.isNull())) {
                // Search for any classes with static constructors that might need to be called
                send("Searching for any class dependencies that have static constructors...");
                for (const [dep, meta] of classDependencies) {
                    const klass = dep as Il2Cpp.Class;
                    if (meta?.callStaticConstructor && klass.hasStaticConstructor) {
                        send(`Initializing class ${klass.name} by calling its static constructor now`);
                        klass.initialize();
                    }
                }

                throw new Error("Did not load all dependencies properly");
            }

            // All the dependencies were loaded correctly
            send("Success, all dependencies have been loaded!");
            return dependencies as ReturnType<T>;
        } catch (error: unknown) {
            // If there are retries remaining
            if (retries > 0) {
                send(
                    `Failed to load all dependencies, will try ${retries} more times, waiting for ${waitMs}ms before the next attempt`
                );

                // Wait for the desired timeout and then recurse
                await new Promise((resolve) => setTimeout(resolve, waitMs));
                return this._waitForDependencies(dependencyLoader, retries - 1, waitMs);
            }

            // Otherwise, throw this error to reject the promise
            throw error;
        }
    }

    protected transformEnumFieldsToSource = (enumFields: Array<[string, string]>): string =>
        enumFields.map(([name, value]) => `${name} = "${value}"`).join(", \n");
}
