import Link from "next/link";
import Image from "next/image";
import Footer from "@/components/footer.js";
import LoginForm from "@/components/loginForm";

const Login = () => {
    return (
        <div className="flex flex-col min-h-screen bg-gradient-light">
            <div className="flex-grow">
                <div className="container mx-auto">
                    <div className="flex justify-center px-6 my-12">
                        <div className="w-full xl:w-3/4 lg:w-11/12 flex rounded-lg shadow">
                            <div className="w-full h-auto hidden lg:block lg:w-1/2 bg-cover rounded-l-lg relative">
                                <RandomBitizenImage className="rounded-l-lg" />
                            </div>
                            <div className="w-full lg:w-1/2 bg-white p-5 rounded-lg lg:rounded-l-none">
                                <h3 className="pt-4 text-2xl text-center">Welcome Back!</h3>
                                <form className="px-8 pt-6 pb-8 mb-4 bg-white rounded" onSubmit={onSubmit}>
                                    <div className="mb-4">
                                        <div className="mb-3">
                                            <label
                                                className="block mb-2 text-sm font-bold text-gray-700"
                                                htmlFor="username"
                                            >
                                                {"Username or email"}
                                            </label>
                                            <input
                                                className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none"
                                                id="username"
                                                type="text"
                                                placeholder="Username"
                                                required={true}
                                                minLength={0}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-4">
                                        <div className="mb-3">
                                            <label
                                                className="block mb-2 text-sm font-bold text-gray-700"
                                                htmlFor="password"
                                            >
                                                {"Password"}
                                            </label>
                                            <input
                                                className="w-full px-3 py-2 text-sm leading-tight text-gray-700 border rounded shadow appearance-none focus:outline-none"
                                                id="password"
                                                type="password"
                                                placeholder="**********"
                                                required={true}
                                                minLength={0}
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>
                                    <div className="mb-6 text-center">
                                        <button
                                            className="w-full px-4 py-2 font-bold text-white bg-gray-700 rounded-full hover:bg-black"
                                            type="submit"
                                        >
                                            Sign In
                                        </button>
                                    </div>

                                    {/* {error && validationErrors.length <= 0 && (
                                        <p className="mb-2 text-center">❗Invalid Login</p>
                                    )}
                                    {loading && !error && <p className="mb-4 text-center">Loading...</p>} */}

                                    <hr className="mb-6 border-t" />
                                    <div className="text-center">
                                        <div className="inline-block text-sm text-blue-500 align-baseline hover:text-blue-800">
                                            <Link href="/register">Create an Account!</Link>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <div className="inline-block text-sm text-blue-500 align-baseline hover:text-blue-800">
                                            <Link href="/forgot-password">Forgot Password?</Link>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <Footer />
        </div>
    );
};

export default Login;
