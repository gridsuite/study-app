/**
 * Copyright (c) 2020, RTE (http://www.rte-france.com)
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useLayoutEffect,
    useRef,
    useState,
} from 'react';
import PropTypes from 'prop-types';

import { FormattedMessage } from 'react-intl';

import Container from '@material-ui/core/Container';
import Box from '@material-ui/core/Box';
import CloseIcon from '@material-ui/icons/Close';
import IconButton from '@material-ui/core/IconButton';
import Paper from '@material-ui/core/Paper';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import Alert from '@material-ui/lab/Alert';
import LinearProgress from '@material-ui/core/LinearProgress';

import { fetchSvg } from '../utils/rest-api';

import { SVG } from '@svgdotjs/svg.js';
import '@svgdotjs/svg.panzoom.js';

const maxWidth = 800;
const maxHeight = 700;

const useStyles = makeStyles((theme) => ({
    div: {
        maxWidth: maxWidth,
        maxHeight: maxHeight,
        overflowX: 'hidden',
        overflowY: 'hidden',
    },
    diagram: {
        '& .component-label': {
            fill: theme.palette.text.primary,
            'font-size': 12,
            'font-family': theme.typography.fontFamily,
        },
    },
    close: {
        padding: 0,
    },
    error: {
        maxWidth: maxWidth,
        maxHeight: maxHeight,
    },
    errorUpdateSwitch: {
        position: 'absolute',
        top: 25,
        left: 0,
        right: 0,
    },
}));

const SvgNotFound = (props) => {
    const classes = useStyles();
    return (
        <Container className={classes.error}>
            <Typography variant="h5">
                <FormattedMessage
                    id="svgNotFound"
                    values={{
                        svgUrl: props.svgUrl,
                        error: props.error.message,
                    }}
                />
            </Typography>
        </Container>
    );
};

const noSvg = { svg: null, metadata: null, error: null, svgUrl: null };

const SWITCH_COMPONENT_TYPES = ['BREAKER', 'DISCONNECTOR', 'LOAD_BREAK_SWITCH'];

const SingleLineDiagram = forwardRef((props, ref) => {
    const [svg, setSvg] = useState(noSvg);
    const svgPrevViewbox = useRef();
    const svgDraw = useRef();

    const [forceState, updateState] = useState(false);

    const [loadingState, updateLoadingState] = useState(false);

    const forceUpdate = useCallback(() => {
        if (svgDraw.current) {
            svgPrevViewbox.current = svgDraw.current.viewbox();
        }
        updateState((s) => !s);
    }, []);

    useImperativeHandle(
        ref,
        () => ({
            reloadSvg: forceUpdate,
        }),
        // Note: forceUpdate doesn't change
        [forceUpdate]
    );

    useEffect(() => {
        if (props.svgUrl) {
            updateLoadingState(true);
            fetchSvg(props.svgUrl)
                .then((data) => {
                    setSvg({
                        svg: data.svg,
                        metadata: data.metadata,
                        error: null,
                        svgUrl: props.svgUrl,
                    });
                    updateLoadingState(false);
                })
                .catch(function (error) {
                    console.error(error.message);
                    setSvg({
                        svg: null,
                        metadata: null,
                        error,
                        svgUrl: props.svgUrl,
                    });
                    updateLoadingState(false);
                });
        } else {
            setSvg(noSvg);
        }
    }, [props.svgUrl, forceState]);

    const {
        onNextVoltageLevelClick,
        onBreakerClick,
        isComputationRunning,
    } = props;
    useLayoutEffect(() => {
        if (svg.svg) {
            // calculate svg width and height
            const divElt = document.getElementById('sld-svg');
            const svgEl = divElt.getElementsByTagName('svg')[0];
            const bbox = svgEl.getBBox();
            const xOrigin = bbox.x - 20;
            const yOrigin = bbox.y - 20;
            const svgWidth = bbox.width + 40;
            const svgHeight = bbox.height + 40;
            // using svgdotjs panzoom component to pan and zoom inside the svg, using svg width and height previously calculated for size and viewbox
            divElt.innerHTML = ''; // clear the previous svg in div element before replacing
            const draw = SVG()
                .addTo(divElt)
                .size(svgWidth, svgHeight)
                .viewbox(xOrigin, yOrigin, svgWidth, svgHeight)
                .panZoom({
                    panning: true,
                    zoomMin: 0.5,
                    zoomMax: 10,
                    zoomFactor: 0.3,
                    margins: {
                        top: svgHeight / 4,
                        left: svgWidth / 4,
                        bottom: svgHeight / 4,
                        right: svgWidth / 4,
                    },
                });
            if (svgPrevViewbox.current) {
                draw.viewbox(svgPrevViewbox.current);
                svgPrevViewbox.current = null;
            }
            draw.svg(svg.svg).node.firstElementChild.style.overflow = 'visible';
            draw.on('panStart', function (evt) {
                divElt.style.cursor = 'move';
            });
            draw.on('panEnd', function (evt) {
                divElt.style.cursor = 'default';
            });

            // handling the navigation between voltage levels
            const elements = svg.metadata.nodes.filter(
                (el) => el.nextVId !== null
            );
            elements.forEach((el) => {
                const domEl = document.getElementById(el.id);
                domEl.style.cursor = 'pointer';
                domEl.addEventListener('click', function (e) {
                    const id = e.target.parentElement.id;
                    const meta = svg.metadata.nodes.find(
                        (other) => other.id === id
                    );
                    onNextVoltageLevelClick(meta.nextVId);
                });
            });

            // handling the click on a switch
            if (!isComputationRunning) {
                const switches = svg.metadata.nodes.filter((element) =>
                    SWITCH_COMPONENT_TYPES.includes(element.componentType)
                );
                switches.forEach((aSwitch) => {
                    const domEl = document.getElementById(aSwitch.id);
                    domEl.style.cursor = 'pointer';
                    domEl.addEventListener('click', function (event) {
                        const clickedElementId = event.currentTarget.id;
                        const switchMetadata = svg.metadata.nodes.find(
                            (value) => value.id === clickedElementId
                        );
                        const switchId = switchMetadata.equipmentId;
                        const open = switchMetadata.open;
                        svgPrevViewbox.current = draw.viewbox();
                        onBreakerClick(switchId, !open, event.currentTarget);
                    });
                });
            }

            svgDraw.current = draw;
        }
        // Note: onNextVoltageLevelClick and onBreakerClick don't change
    }, [svg, onNextVoltageLevelClick, onBreakerClick, isComputationRunning]);

    useEffect(() => {
        svgPrevViewbox.current = null;
    }, [props.updateSwitchMsg]);

    const classes = useStyles();

    const onCloseHandler = () => {
        if (props.onClose !== null) {
            props.onClose();
        }
    };

    let inner;
    let finalClasses;
    if (svg.error) {
        finalClasses = classes.error;
        inner = <SvgNotFound svgUrl={svg.svgUrl} error={svg.error} />;
    } else {
        finalClasses = classes.diagram;
        inner = (
            <div
                id="sld-svg"
                style={{ height: '100%' }}
                className={classes.div}
                dangerouslySetInnerHTML={{ __html: svg.svg }}
            />
        );
    }

    let msgUpdateSwitch;
    if (props.updateSwitchMsg !== '') {
        msgUpdateSwitch = (
            <Alert className={classes.errorUpdateSwitch} severity="error">
                {props.updateSwitchMsg}
            </Alert>
        );
    } else {
        msgUpdateSwitch = '';
    }

    let displayProgress;
    if (loadingState) {
        displayProgress = <LinearProgress />;
    } else {
        displayProgress = '';
    }

    return (
        <Paper elevation={1} variant="outlined" className={finalClasses}>
            <Box display="flex" flexDirection="row">
                <Box flexGrow={1}>
                    <Typography>{props.diagramTitle}</Typography>
                </Box>
                <IconButton className={classes.close} onClick={onCloseHandler}>
                    <CloseIcon />
                </IconButton>
            </Box>
            <Box height={2}>{displayProgress}</Box>
            {msgUpdateSwitch}
            {inner}
        </Paper>
    );
});

SingleLineDiagram.propTypes = {
    diagramTitle: PropTypes.string.isRequired,
    svgUrl: PropTypes.string.isRequired,
    onClose: PropTypes.func,
    updateSwitchMsg: PropTypes.string.isRequired,
    isComputationRunning: PropTypes.bool.isRequired,
};

export default SingleLineDiagram;
