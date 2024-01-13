import type React from "react";

import { Link } from "@mui/material";
import { Typography } from "@mui/material";

export const Copyright: React.FunctionComponent = () => {
    return (
        <Typography variant="body2" color="textSecondary" align="center">
            {"Copyright © "}
            <Link href="https://tinyburg.app">Tinyburg</Link> {new Date().getFullYear()}
            {"."}
        </Typography>
    );
};

export default Copyright;
