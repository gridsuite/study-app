/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React, {useEffect} from 'react';

import {useSelector} from 'react-redux'

import {Route, Switch, useHistory, useLocation} from 'react-router-dom';

import CssBaseline from '@material-ui/core/CssBaseline';
import {createMuiTheme, ThemeProvider} from '@material-ui/core/styles';
import StudyPane from './study-pane';
import StudyManager from './study-manager';
import TopBar from './top-bar';
import {LIGHT_THEME} from '../redux/actions'
import Parameters from "./parameters";
import { AuthService } from '../services/AuthService';
import { UserManager } from 'oidc-client';


const lightTheme = createMuiTheme({
    palette: {
        type: 'light',
    },
    mapboxStyle: 'mapbox://styles/mapbox/light-v9'
});

const darkTheme = createMuiTheme({
    palette: {
        type: 'dark',
    },
    mapboxStyle: 'mapbox://styles/mapbox/dark-v9'
});

const getMuiTheme = (theme) => {
    if (theme === LIGHT_THEME) {
        return lightTheme;
    } else {
        return darkTheme;
    }
};

const SignInCallback = () => {

    function handleCallback() {
        console.debug("handleCallback");
        new UserManager({
            response_mode: "fragment",
        }).signinRedirectCallback().then(function () {
            window.location = "/";
        }).catch(function (e) {
            console.error(e);
        });
    }

    useEffect(() => {
        handleCallback();
    }, []);

    return (
        <h1>Authentication callback processing...</h1>
    )
};

const SilentRenew = () => {

    function handleCallback() {
        console.debug("SilentRenew");
        new UserManager({
            response_mode: "fragment",
        }).signinSilentCallback().then(function () {
            window.location = "/";
        }).catch(function (e) {
            console.error(e);
        });
    }

    useEffect(() => {
        handleCallback();
    }, []);

    return (
        <h1>Silent callback processing...</h1>
    )
};

const App = () => {
    const  authService = new AuthService();

    const theme = useSelector(state => state.theme);

    const [user, setUser] = React.useState(null);
    const [logOut, setLogOut] = React.useState(false);

    const history = useHistory();

    const location = useLocation();

    function studyClickHandler(studyName) {
        history.push("/studies/" + studyName);
    }

    function showParameters() {
        if (location.pathname === "/parameters") {
            // if already at parameters go back to study
            history.goBack();
        } else {
            history.push("/parameters");
        }
    }

    function  logout() {
        setLogOut(true);
    }

    return (
        <ThemeProvider theme={getMuiTheme(theme)}>
            <React.Fragment>
                <CssBaseline />
                <TopBar onParametersClick={ () => showParameters() } onLogoutClick={() => logout()}/>
                <Switch>
                    <Route exact path="/">
                        <StudyManager logout={logOut} onStudyClick={ name => studyClickHandler(name) }/>
                    </Route>
                    <Route exact path="/studies/:studyName">
                        <StudyPane/>
                    </Route>
                    <Route exact path="/parameters">
                        <Parameters/>
                    </Route>
                    <Route exact path="/sign-in-callback">
                        <SignInCallback/>
                    </Route>
                    <Route exact path="/silent-renew">
                        <SilentRenew/>
                    </Route>
                    <Route>
                        <h1>Error: bad URL; No matched Route.</h1>
                    </Route>
                </Switch>
            </React.Fragment>
        </ThemeProvider>
    )
};

export default App;
