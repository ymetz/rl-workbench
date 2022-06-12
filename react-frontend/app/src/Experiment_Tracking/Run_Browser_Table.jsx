import React, { Component } from 'react';
import BootstrapTable from 'react-bootstrap-table-next';
import cellEditFactory, { Type } from 'react-bootstrap-table2-editor';
import ToolkitProvider, { Search } from 'react-bootstrap-table2-toolkit';
import { Badge, Button } from 'react-bootstrap';
import { scaleOrdinal, schemeTableau10 } from 'd3';

const dateFormater = (cell, row) => {
    const date = new Date(cell * 1000);
    const ret_val = date.toLocaleString();
    return ret_val;
};

const tagFormater = (cell, row) => {
    if (cell === '[]') return '';
    const tag_list = cell.split(',');
    const return_list = tag_list.map((tag) => {
        return (
            <Badge key={tag} className="runbrowserstyles.pill" pill variant="secondary">
                {tag}
            </Badge>
        );
    });
    return <div className="runbrowserstyles.tag_list">{return_list}</div>;
};

export default class Run_Browser_Table extends Component {
    constructor(props) {
        super(props);

        this.state = {
            highlighted_row_index: -1,
            data: [],
            row_count: 0,
        };
    }

    colorScale = scaleOrdinal(schemeTableau10).domain(Array.from({ length: 10 }, (x, i) => i));

    statusFormater = (cell, row) => {
        if (cell === 'RUNNING')
            return (
                <div>
                    {cell} <Button variant="danger">cancel</Button>
                </div>
            );
        else return cell;
    };

    getColumns() {
        return [
            {
                dataField: 'id',
                text: 'Experiment ID',
                sort: true,
            },
            {
                dataField: 'exp_name',
                text: 'Experiment Name',
                editable: false,
                sort: true,
            },
            {
                dataField: 'environment',
                text: 'Environment Name',
                editable: false,
                sort: true,
            },
            {
                dataField: 'framework',
                text: 'Framework',
                editable: false,
            },
            {
                dataField: 'num_timesteps',
                text: 'Training Steps',
                editable: false,
            },
            {
                dataField: 'run_timestamp',
                text: 'Started running',
                formatter: dateFormater,
                editable: false,
                sort: true,
            },
            {
                dataField: 'exp_tags',
                text: 'Tags',
                formatter: tagFormater,
            },
            {
                dataField: 'exp_comment',
                text: 'Comment',
                editor: {
                    type: Type.TEXTAREA,
                },
            },
            {
                dataField: 'status',
                text: 'Status',
                editable: false,
                formatter: this.statusFormater,
                sort: true,
            },
        ];
    }

    handleOnSelect = (row, isSelect) => {
        this.props.onHighlight(row.id, isSelect);
    };

    handleOnSelectAll = (isSelect, rows, e) => {
        this.props.toggleAllRows(isSelect);
    };

    afterSearch = (newResult) => {
        this.props.onFilter(newResult);
    };

    expandRow = {
        renderer: (row) => (
            <div>
                <h4>Experiment Details {row.exp_name}</h4>
                <p>Environment: {row.environment}</p>
                <p>Algorithm: {row.algorithm}</p>
                <p>
                    Number of Timesteps: {row.num_timesteps} | Callback Freq.: {row.callback_frequency} | Timesteps per
                    Callback: {row.timesteps_per_eval}
                </p>
                <p>Setup Config: {JSON.stringify(row.setup_config)}</p>
                <p>Path: {row.path}</p>
                <Button variant="warning" onClick={() => this.props.removeExperiment(row.id)}>
                    delete
                </Button>
            </div>
        ),
        showExpandColumn: true,
        expandColumnPosition: 'right',
    };

    render() {
        const { SearchBar } = Search;

        const selectRow = {
            mode: 'checkbox',
            bgColor: 'rgba(103, 255, 117, 0.8)',
            selected: this.props.highlightedRows,
            onSelect: this.handleOnSelect.bind(this),
            onSelectAll: this.handleOnSelectAll.bind(this),
        };

        return (
            <ToolkitProvider
                keyField="id"
                data={this.props.experiments}
                columns={this.getColumns()}
                search={{ afterSearch: this.afterSearch.bind(this) }}
                bootstrap4
            >
                {(props) => (
                    <div>
                        <h2>Experiments</h2>
                        <SearchBar {...props.searchProps} placeholder="Search..." />
                        <hr />
                        <BootstrapTable
                            {...props.baseProps}
                            cellEdit={cellEditFactory({ mode: 'dbclick', blurToSave: true })}
                            selectRow={selectRow}
                            expandRow={this.expandRow}
                            striped
                            hover
                        />
                    </div>
                )}
            </ToolkitProvider>
        );
    }
}
