import type React from "react";

import Link from "@material-ui/core/Link";
import Typography from "@material-ui/core/Typography";

export const Copyright: React.FunctionComponent<{}> = ({}) => {
    return (
        <Typography variant="body2" color="textSecondary" align="center">
            {"Copyright © "}
            <Link color="inherit" href="https://tinyburg.app">
                Tinyburg
            </Link>{" "}
            {new Date().getFullYear()}
            {"."}
        </Typography>
    );
};

export default Copyright;
