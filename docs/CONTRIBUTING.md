# Contributing to Tinyburg

:+1::tada: First off, thanks for taking the time to contribute! :tada::+1:

The following is a set of guidelines for contributing to Tinyburg and its packages. These are mostly guidelines, not rules. Use your best judgment, and feel free to propose changes to this document in a pull request.

## Table Of Contents

[Code of Conduct](#code-of-conduct)

[How Can I Contribute?](#how-can-i-contribute)

-   [Reporting Bugs](#reporting-bugs)
-   [Suggesting Enhancements](#suggesting-enhancements)
-   [Your First Code Contribution](#your-first-code-contribution)
-   [Pull Requests](#pull-requests)

[Styleguides](#styleguides)

-   [Git Commit Messages](#git-commit-messages)
-   [JavaScript Typescript Styleguide](#javaScript-typescript-styleguide)

## Code of Conduct

This project and everyone participating in it is governed by the [Tinyburg Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for Tinyburg. Following these guidelines helps maintainers and the community understand your report :pencil:, reproduce the behavior :computer: :computer:, and find related reports :mag_right:.

> **Note:** If you find a **Closed** issue that seems like it is the same thing that you're experiencing, open a new issue and include a link to the original issue in the body of your new one.

#### How Do I Submit A (Good) Bug Report?

Explain the problem and include additional details to help maintainers reproduce the problem:

-   **Use a clear and descriptive title** for the issue to identify the problem.
-   **Describe the exact steps which reproduce the problem** in as many details as possible.
-   **Describe the behavior you observed after following the steps** and point out what exactly is the problem with that behavior.
-   **Explain which behavior you expected to see instead and why.**

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for Tinyburg, including completely new features and minor improvements to existing functionality. Following these guidelines helps maintainers and the community understand your suggestion :pencil: and find related suggestions :mag_right:.

#### How Do I Submit A (Good) Enhancement Suggestion?

-   **Use a clear and descriptive title** for the issue to identify the suggestion.
-   **Provide a step-by-step description of the suggested enhancement** in as many details as possible.
-   **Provide specific examples to demonstrate the steps**. Include copy/pasteable snippets which you use in those examples, as [Markdown code blocks](https://help.github.com/articles/markdown-basics/#multiple-lines).
-   **Describe the current behavior** and **explain which behavior you expected to see instead** and why.

### Your First Code Contribution

Unsure where to begin contributing to Tinyburg? You can start by looking through these `beginner` and `help-wanted` issues:

-   [Beginner issues][beginner] - issues which should only require a few lines of code, and a test or two.
-   [Help wanted issues][help-wanted] - issues which should be a bit more involved than `beginner` issues.

### Pull Requests

Please follow these steps to have your contribution considered by the maintainers:

1. Follow the [styleguides](#styleguides)
2. After you submit your pull request, verify that all [status checks](https://help.github.com/articles/about-status-checks/) are passing. If a status check is failing, and you believe that the failure is unrelated to your change, please leave a comment on the pull request explaining why you believe the failure is unrelated. A maintainer will re-run the status check for you. If we conclude that the failure was a false positive, then we will open an issue to track that problem with our status check suite.

While the prerequisites above must be satisfied prior to having your pull request reviewed, the reviewer(s) may ask you to complete additional design work, tests, or other changes before your pull request can be ultimately accepted.

## Styleguides

### Git Commit Messages

-   Use the present tense ("Add feature" not "Added feature")
-   Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
-   Limit the first line to 72 characters or less
-   Reference issues and pull requests liberally after the first line
-   Consider starting the commit message with an applicable emoji:
    -   :art: `:art:` when improving the format/structure of the code
    -   :racehorse: `:racehorse:` when improving performance
    -   :non-potable_water: `:non-potable_water:` when plugging memory leaks
    -   :memo: `:memo:` when writing docs
    -   :penguin: `:penguin:` when fixing something on Linux
    -   :apple: `:apple:` when fixing something on macOS
    -   :checkered_flag: `:checkered_flag:` when fixing something on Windows
    -   :bug: `:bug:` when fixing a bug
    -   :fire: `:fire:` when removing code or files
    -   :green_heart: `:green_heart:` when fixing the CI build
    -   :white_check_mark: `:white_check_mark:` when adding tests
    -   :lock: `:lock:` when dealing with security
    -   :arrow_up: `:arrow_up:` when upgrading dependencies
    -   :arrow_down: `:arrow_down:` when downgrading dependencies
    -   :shirt: `:shirt:` when removing linter warnings

### JavaScript Typescript Styleguide

All JavaScript/Typescript code is linted with [Prettier](https://prettier.io/).

-   Prefer the object spread operator (`{...anotherObj}`) to `Object.assign()`
-   Inline `export`s with expressions whenever possible

    ```ts
    // Use this:
    export const foo = (bar: string) => {};

    // Instead of:
    const foo = (bar: string) => {};
    export default foo;
    ```

-   Place requires in the following order:
    -   Built in Node Modules (such as `path`)
    -   Local Modules (using relative paths)
-   Place class properties in the following order:
    -   Class methods and properties (methods starting with `static`)
    -   Instance methods and properties

[beginner]: https://github.com/leonitousconforti/tinyburg/labels/good%20first%20issue
[help-wanted]: https://github.com/leonitousconforti/tinyburg/labels/help%20wanted
