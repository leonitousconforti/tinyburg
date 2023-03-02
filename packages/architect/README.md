# @tinyburg/architect

Architect is a tool for creating/designing an environment for TinyTower to run in. Other tinyburg packages that rely on an instance of the game, whether for testing purposes or to extract information, will use architect to bring up an instance of the game and connect to it. This removes the barrier of needing a real rooted android device to test certain things.

## How?

Architect leverages the android studio emulator from the android sdk. Why not use Bluestacks or Genymotion? Because the android studio emulator has an api for interacting with it, is easy to install and configure, and it can run on almost any machine (only one I could get running on both my desktop and my m1 mac laptop, which is very important for me). The emulator api can be used to interact with the emulator and thus the game itself, removing a lot of work that would have to be done for managing multiple on the same machine. I wanted to run a lot of these on one machine, and this way I don't have to write code to make sure that every window has its own region of the screen and this is where it needs to move the mouse for this window, ect. Instead, packages like @tinyburg/doorman and @tinyburg/insight can just directly communicate with the emulator, there is no need for the emulator window to be even visible on the display.

## Where can architect run TinyTower

-   Local docker host (linux hosts only)
-   Remote docker host (using ssh or exposed docker daemon, linux hosts only)
-   ~~Local machine, any os (android command line tools must be installed)~~
-   ~~Remote machine over ssh, any os (android command line tools must be installed)~~

## Caveats to keep in mind

-   In the docker cases, the HOST operating system where docker is running must be linux and have kvm acceleration
-   ~~In the local and ssh cases, the HOST machine must have android command line tools installed and the ANDROID_HOME environment variable set~~
-   ~~In ALL cases, wether in docker or not, the HOST machine must have kvm acceleration available~~

## Why only docker?

My initial idea included support for running on any system, local or via ssh. But doing that made the project turn into a nodejs wrapper for a bunch of shell commands and the functionality wasn't honestly needed. This package will mostly be used by other packages in their test suites, and so puting restriction on where this can run was perfectly fine by me. If I really wanted to, I could always just change a url and have the test suites for those packages point to a different emulator temporarily, either locally or on the network, that I would manually bring up with android studio. In the end, it just made more sense to limit where architect can run.

## Future

Speed up container start time. Right now it takes around 3mins for the container to be healthy, which is a bit to long in my opinion.

## Inspiration for this

Heavily inspired by [https://github.com/google/android-emulator-container-scripts]

## Why are only google apis and play store images supported?

Note to self, from: [https://android-developers.googleblog.com/2020/03/run-arm-apps-on-android-emulator.html]

_Note that the ARM to x86 translation technology enables the execution of intellectual property owned by Arm Limited. It will only be available on Google APIs and Play Store system images, and can only be used for application development and debug purposes on x86 desktop, laptop, customer on-premises servers, and customer-procured cloud-based environments. The technology should not be used in the provision of commercial hosted services._
