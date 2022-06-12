// App.jsx
import React, { Component } from 'react';
import axios from 'axios';
import { Button, Row, Col, Badge } from 'react-bootstrap';
import BootstrapTable from 'react-bootstrap-table-next';
import cellEditFactory, { Type } from 'react-bootstrap-table2-editor';
import ToolkitProvider, { Search } from 'react-bootstrap-table2-toolkit';
import filterFactory, { textFilter } from 'react-bootstrap-table2-filter';
import paginationFactory, {
    PaginationProvider,
    PaginationTotalStandalone,
    PaginationListStandalone,
} from 'react-bootstrap-table2-paginator';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTrash, faClipboard } from '@fortawesome/free-solid-svg-icons';
import Database_Input from './Database_Input';

const dateFormater = (cell, row) => {
    const date = new Date(cell * 1000);
    const ret_val = date.toLocaleString();
    return ret_val;
};

const tagFormater = (cell, row) => {
    if (cell === undefined || cell === '[]') return '';
    const tag_list = cell.replace(/[\[\]']+/g, '').split(',');
    const return_list = tag_list.map((tag) => {
        return (
            <Badge key={tag} className="runbrowserstyles.pill" pill variant="secondary">
                {tag}
            </Badge>
        );
    });
    return <div className="runbrowserstyles.tag_list">{return_list}</div>;
};

const listFormater = (cell, row) => {
    if (cell === undefined || cell === '[]') return '';
    return cell.replace(/[\[\]']+/g, '');
};

export default class DatabaseBrowser extends Component {
    constructor(props) {
        super(props);

        this.state = {
            items: [],
            inputFormValidated: false,
            projectFormValues: {},
            copy_timestamp: 0,
            copy_item: {},
        };
    }

    componentDidMount() {
        this._getItems();
    }

    componentDidUpdate(prevProps, prevState) {
        if (prevProps.table !== this.props.table) {
            this._getItems();
        }
    }

    _getItems() {
        axios.get('/routing/get_' + this.props.table).then((res) => {
            this.setState({ items: res.data });
        });
    }

    submitItem(project) {
        axios.post('/routing/register_' + this.props.table, project).then(() => {
            this._getItems();
        });
    }

    updateItem(newVal, row, col) {
        axios.post(
            '/routing/update_' + this.props.table + '?id=' + row.id,
            Object.fromEntries(this.props.schema.map((c) => [c.dataField, row[c.dataField]]))
        );
    }

    removeItem(item_id) {
        axios.post('/routing/remove_' + this.props.table + '?id=' + item_id).then(() => {
            this._getItems();
        });
    }

    copyItem(row) {
        const item = row;
        this.setState({ copy_timestamp: Date.now(), copy_item: item });
    }

    getFormater(formatter) {
        if (formatter === 'date') {
            return dateFormater;
        } else if (formatter === 'tag') {
            return tagFormater;
        } else if (formatter === 'list') {
            return listFormater;
        } else {
            return null;
        }
    }

    getColumns() {
        return this.props.schema
            .map((col) => ({
                dataField: col.dataField,
                text: col.text,
                sort: true,
                filter: textFilter(),
                formatter: this.getFormater(col.formatter),
                editor: {
                    type: Type.TEXTAREA,
                },
            }))
            .concat([
                {
                    dataField: 'removeColumn',
                    text: '',
                    isDummyField: true,
                    editable: false,
                    formatter: (cell, row) => {
                        return (
                            <div>
                                <Button
                                    key={'del_button' + row.id}
                                    variant="dark"
                                    onClick={() => this.removeItem(row.id)}
                                >
                                    <FontAwesomeIcon icon={faTrash} />
                                </Button>
                                <Button key={'copy_button' + row.id} variant="info" onClick={() => this.copyItem(row)}>
                                    <FontAwesomeIcon icon={faClipboard} />
                                </Button>
                            </div>
                        );
                    },
                },
            ]);
    }

    render() {
        const { SearchBar } = Search;

        return (
            <>
                <Row>
                    <Col>
                        <PaginationProvider
                            pagination={paginationFactory({
                                custom: true,
                                totalSize: this.state.items.length,
                            })}
                        >
                            {({ paginationProps, paginationTableProps }) => (
                                <ToolkitProvider
                                    keyField="id"
                                    data={this.state.items}
                                    columns={this.getColumns()}
                                    search
                                    bootstrap4
                                >
                                    {(props) => (
                                        <div>
                                            <div>
                                                <SearchBar
                                                    {...props.searchProps}
                                                    placeholder="Search..."
                                                    style={{ marginTop: 10 }}
                                                />
                                            </div>
                                            <div>
                                                <BootstrapTable
                                                    {...props.baseProps}
                                                    {...paginationTableProps}
                                                    cellEdit={cellEditFactory({
                                                        mode: 'click',
                                                        blurToSave: true,
                                                        afterSaveCell: (_, newValue, row, column) =>
                                                            this.updateItem(newValue, row, column),
                                                    })}
                                                    striped
                                                    filter={filterFactory()}
                                                    filterPosition="top"
                                                    hover
                                                />
                                                <div style={{ float: 'left' }}>
                                                    <PaginationTotalStandalone {...paginationProps} />
                                                </div>
                                                <div style={{ float: 'right' }}>
                                                    <PaginationListStandalone {...paginationProps} />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </ToolkitProvider>
                            )}
                        </PaginationProvider>
                    </Col>
                </Row>
                <hr />
                <Row>
                    <Database_Input
                        submitTask={this.submitItem.bind(this)}
                        copyTimeStamp={this.state.copy_timestamp}
                        copyTask={this.state.copy_item}
                        itemType={this.props.table}
                    />
                </Row>
            </>
        );
    }
}
