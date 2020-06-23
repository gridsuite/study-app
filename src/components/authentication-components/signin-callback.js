/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React, {useEffect} from "react";

const SignInCallback = (props) => {
    useEffect(() => {
        if (props.userManager.instance !== null) {
            props.handleSigninCallback();
        }
    }, [props.userManager]);

    return (
        <h1> </h1>
    )
};
export default SignInCallback;
