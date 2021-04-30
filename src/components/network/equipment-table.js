import React, { useCallback, useState } from 'react';
import { useIntl } from 'react-intl';
import { requestNetworkChange } from '../../utils/rest-api';
import { IconButton, TextField } from '@material-ui/core';
import CreateIcon from '@material-ui/icons/Create';
import Grid from '@material-ui/core/Grid';
import CheckIcon from '@material-ui/icons/Check';
import ClearIcon from '@material-ui/icons/Clear';
import TableCell from '@material-ui/core/TableCell';
import LoaderWithOverlay from '../loader-with-overlay';
import VirtualizedTable from '../util/virtualized-table';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles((theme) => ({
    cell: {
        display: 'flex',
        alignItems: 'right',
        textAlign: 'right',
        boxSizing: 'border-box',
        flex: 1,
        width: '100%',
        height: '100%',
        cursor: 'initial',
    },
}));

const ROW_HEIGHT = 48;

export const EquipmentTable = ({
    fetched,
    studyUuid,
    rows,
    selectedColumnsNames,
    tableDefinition,
    filter,
}) => {
    const [lineEdit, setLineEdit] = useState(undefined);
    const classes = useStyles();
    const intl = useIntl();

    const isLineOnEditMode = useCallback(
        (row) => {
            return (lineEdit && lineEdit.line === row) || false;
        },
        [lineEdit]
    );

    function commitChanges(rowData) {
        let groovyCr =
            'equipment = network.get' +
            lineEdit.equipmentType +
            "('" +
            lineEdit.id.replace(/'/g, "\\'") +
            "')\n";
        Object.values(lineEdit.newValues).forEach((cr) => {
            groovyCr += cr.changeCmd.replace(/\{\}/g, cr.value) + '\n';
        });
        requestNetworkChange(studyUuid, groovyCr).then((response) => {
            if (response.ok) {
                Object.entries(lineEdit.newValues).forEach(([key, cr]) => {
                    rowData[key] = cr.value;
                });
            } else {
                Object.entries(lineEdit.oldValues).forEach(
                    ([key, oldValue]) => {
                        rowData[key] = oldValue;
                    }
                );
            }
            setLineEdit({});
        });
    }

    function resetChanges(rowData) {
        Object.entries(lineEdit.oldValues).forEach(([key, oldValue]) => {
            rowData[key] = oldValue;
        });
        setLineEdit({});
    }

    function createEditableRow(cellData, equipmentType) {
        return (
            (!isLineOnEditMode(cellData.rowIndex) && (
                <IconButton
                    disabled={lineEdit && lineEdit.id && true}
                    onClick={() =>
                        setLineEdit({
                            line: cellData.rowIndex,
                            oldValues: {},
                            newValues: {},
                            id: cellData.rowData['id'],
                            equipmentType: equipmentType,
                        })
                    }
                >
                    <CreateIcon alignmentBaseline={'middle'} />
                </IconButton>
            )) || (
                <Grid container>
                    <Grid item>
                        <IconButton
                            size={'small'}
                            onClick={() => commitChanges(cellData.rowData)}
                        >
                            <CheckIcon />
                        </IconButton>
                        <IconButton
                            size={'small'}
                            onClick={() => resetChanges(cellData.rowData)}
                        >
                            <ClearIcon />
                        </IconButton>
                    </Grid>
                </Grid>
            )
        );
    }

    function formatCellData(cellData, isNumeric, fractionDigit) {
        return cellData.rowData[cellData.dataKey] && isNumeric && fractionDigit
            ? parseFloat(cellData.rowData[cellData.dataKey]).toFixed(
                  fractionDigit
              )
            : cellData.rowData[cellData.dataKey];
    }

    const defaultCellRender = useCallback(
        (cellData, numeric, fractionDigit) => {
            return (
                <TableCell
                    component="div"
                    variant="body"
                    style={{ height: ROW_HEIGHT, width: cellData.width }}
                    className={classes.cell}
                    align="right"
                >
                    <Grid container direction="column">
                        <Grid item xs={1} />
                        <Grid item xs={1}>
                            {formatCellData(cellData, numeric, fractionDigit)}
                        </Grid>
                    </Grid>
                </TableCell>
            );
        },
        [classes.cell]
    );

    const registerChangeRequest = useCallback(
        (data, changeCmd, value) => {
            // save original value, dont erase if exists
            if (!lineEdit.oldValues[data.dataKey])
                lineEdit.oldValues[data.dataKey] = data.rowData[data.dataKey];
            lineEdit.newValues[data.dataKey] = {
                changeCmd: changeCmd,
                value: value,
            };
            data.rowData[data.dataKey] = value;
        },
        [lineEdit]
    );

    const EditableCellRender = useCallback(
        (cellData, numeric, changeCmd, fractionDigit) => {
            return !isLineOnEditMode(cellData.rowIndex) ||
                cellData.rowData[cellData.dataKey] === undefined ? (
                defaultCellRender(cellData, numeric, fractionDigit)
            ) : (
                <TextField
                    id={cellData.dataKey}
                    type="Number"
                    className={classes.cell}
                    size={'medium'}
                    margin={'normal'}
                    inputProps={{ style: { textAlign: 'center' } }}
                    onChange={(obj) =>
                        registerChangeRequest(
                            cellData,
                            changeCmd,
                            obj.target.value
                        )
                    }
                    defaultValue={formatCellData(
                        cellData,
                        numeric,
                        fractionDigit
                    )}
                />
            );
        },
        [
            classes.cell,
            defaultCellRender,
            isLineOnEditMode,
            registerChangeRequest,
        ]
    );

    const columnDisplayStyle = (key) => {
        return selectedColumnsNames.has(key) ? '' : 'none';
    };

    const generateTableColumns = (table) => {
        return table.columns.map((c) => {
            let column = {
                label: intl.formatMessage({ id: c.id }),
                headerStyle: { display: columnDisplayStyle(c.id) },
                style: { display: columnDisplayStyle(c.id) },
                ...c,
            };
            c.changeCmd !== undefined &&
                (column.cellRenderer = (cell) =>
                    EditableCellRender(
                        cell,
                        c.numeric,
                        c.changeCmd,
                        c.fractionDigits
                    ));
            delete column.changeCmd;
            return column;
        });
    };

    function makeHeaderCell(equipmentType) {
        return {
            width: 65,
            label: '',
            dataKey: '',
            style: {
                display: selectedColumnsNames.size > 0 ? '' : 'none',
            },
            cellRenderer: (cellData) =>
                createEditableRow(cellData, equipmentType),
        };
    }

    return (
        <>
            {!fetched && (
                <LoaderWithOverlay
                    color="inherit"
                    loaderSize={70}
                    loadingMessageText={'Loading'}
                />
            )}
            <VirtualizedTable
                rows={rows}
                filter={filter}
                columns={
                    tableDefinition.header
                        ? [
                              makeHeaderCell(tableDefinition.header),
                              ...generateTableColumns(tableDefinition),
                          ]
                        : generateTableColumns(tableDefinition)
                }
            />
        </>
    );
};
