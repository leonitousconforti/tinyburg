import "frida-il2cpp-bridge";

import type { IBitbookAgentExports } from "../shared/bitbook-agent-exports.js";

import { readObject } from "../helpers/read.js";
import { readEnumFields } from "../helpers/get-enum-fields.js";
import { TinyTowerFridaAgent } from "../shared/base-frida-agent.js";
import { copyDictionaryToJs } from "../helpers/copy-dictionary-to-js.js";

export class GetBitbookData extends TinyTowerFridaAgent<GetBitbookData> {
    public loadDependencies() {
        const csharpAssembly = Il2Cpp.Domain.assembly("Assembly-CSharp");
        const AppUtilClass = csharpAssembly.image.class("AppUtil");
        const BBEventTypeClass = csharpAssembly.image.class("BBEventType");
        const PostMediaTypeClass = csharpAssembly.image.class("PostMediaType");
        const VBitbookPostDataClass = csharpAssembly.image.class("VBitbookPostData");
        const postsField = VBitbookPostDataClass.field<Il2Cpp.Object>("posts").value;

        return {
            AppUtilClass,
            BBEventTypeClass,
            PostMediaTypeClass,
            VBitbookPostDataClass: {
                dependency: VBitbookPostDataClass,
                meta: { callStaticConstructor: true },
            },
            postsField,
        };
    }

    public retrieveData() {
        // Extract the version of the game
        const version = this.dependencies.AppUtilClass.method<Il2Cpp.String>("VersionString").invoke().content;

        // Extract the BBEventType and PostMediaType enum fields
        const BBEventTypeEnumFields = readEnumFields(this.dependencies.BBEventTypeClass);
        const PostMediaTypeEnumFields = readEnumFields(this.dependencies.PostMediaTypeClass);

        // Extract the posts
        const posts =
            // First copy the large dictionary of posts into a Javascript object. This creates a JS object with type
            // Record<number, Il2Cpp.Object> where the value in the object is another dictionary storing the post data
            Object.values(copyDictionaryToJs<number, Il2Cpp.Object>(this.dependencies.postsField))

                // Next, for each post from the big dictionary, copy it over to a JS object
                .map((postIl2cpp) => copyDictionaryToJs<Il2Cpp.String, Il2Cpp.Object>(postIl2cpp))

                // Then, map each post to its entries, and map each entries value using the readObject function
                .map((post) => Object.entries(post).map(([key, value]) => [key, readObject(value)] as const))

                // Finally, reassemble the object from its entries
                .map((postEntries) => Object.fromEntries(postEntries));

        return { TTVersion: version || "unknown", BBEventTypeEnumFields, PostMediaTypeEnumFields, posts };
    }

    public transformToSourceCode() {
        // Source code for the BB Event Type enum
        const BBEventTypeTsFields = this.transformEnumFieldsToSource(this.data.BBEventTypeEnumFields);
        const BBEventTypeSourceTS = `export enum BBEventType { ${BBEventTypeTsFields} }\n`;

        // Source code for the post media type enum
        const PostMediaTypeTsFields = this.transformEnumFieldsToSource(this.data.PostMediaTypeEnumFields);
        const PostMediaTypeSourceTS = `export enum PostMediaType { ${PostMediaTypeTsFields} }\n`;

        // Source code for the posts array
        const postsSourceString = JSON.stringify(this.data.posts)
            .replace(/"event":\s*"(\w+)"/gm, "event: BBEventType.$1")
            .replace(/"mediatype":\s*"(\w+)"/gm, "mediatype: PostMediaType.$1");
        const postsSourceTs = `export const posts = ${postsSourceString} as const;\n`;
        const postSourceTS = "export type Post = typeof posts[number];\n";

        return (
            `// TinyTower version: ${this.data.TTVersion}\n` +
            BBEventTypeSourceTS +
            PostMediaTypeSourceTS +
            "\n" +
            postsSourceTs +
            postSourceTS
        );
    }
}

// Main entry point exported for when this file is compiled as a frida agent
const rpcExports: IBitbookAgentExports = {
    main: async () => {
        const instance = await new GetBitbookData().start();
        return instance.transformToSourceCode();
    },
    mainProducesSourceCode: true,
};
rpc.exports = rpcExports as unknown as RpcExports;
