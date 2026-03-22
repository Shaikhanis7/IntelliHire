import { useState } from "react";

import { useAuth } from "../hooks/useAuth";

export default function LoginForm() {
    const { handleLogin, loading } = useAuth();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const submit = async () => {
        const success = await handleLogin(email, password);
        alert(success ? "Login Success" : "Login Failed");
    };

    return (
        <div style={{ padding: "20px" }}>
            <h2>Login</h2>

            <input onChange={(e) => setEmail(e.target.value)} placeholder="Email" />
            <br /><br />

            <input type="password" onChange={(e) => setPassword(e.target.value)} placeholder="Password" />
            <br /><br />

            <button onClick={submit} disabled={loading}>
                {loading ? "Loading..." : "Login"}
            </button>
        </div>
    );
}