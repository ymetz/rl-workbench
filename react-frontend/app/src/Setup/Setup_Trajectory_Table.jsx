import React, { PureComponent } from 'react';
import { Table } from 'react-bootstrap';
import '../css/Setup.module.css';

export default class Trajectory_table extends PureComponent {
    constructor(props) {
        super(props);
        this.scrollRef = React.createRef();

        this.state = {
            inData: this.props.data,
            div_scroll_top: 0,
        };
    }

    componentDidUpdate() {
        if (this.props.rowId !== undefined) this.scrollToRow(this.props.rowId.value);
    }

    createExperimentTable() {
        if (!this.props.data.actions.length > 0) return;
        const table = [];
        const displayed_columns = ['Step', 'Observations', 'Reward', 'Done', 'Chosen Action'];
        const table_head = (
            <tr>
                {[...displayed_columns].map((kname) => (
                    <th key={kname}>{kname}</th>
                ))}
            </tr>
        );

        for (let i = 0; i < this.props.data.dones.length; i++) {
            table.push(
                <tr id={'tt_row_id' + String(i)} key={'key_' + String(i)}>
                    <td>{i + 1}</td>
                    <td>
                        Observation{' '}
                        <svg
                            className="bi bi-images"
                            width="1em"
                            height="1em"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                d="M12.002 4h-10a1 1 0 00-1 1v8a1 1 0 001 1h10a1 1 0 001-1V5a1 1 0 00-1-1zm-10-1a2 2 0 00-2 2v8a2 2 0 002 2h10a2 2 0 002-2V5a2 2 0 00-2-2h-10z"
                                clipRule="evenodd"
                            />
                            <path d="M10.648 8.646a.5.5 0 01.577-.093l1.777 1.947V14h-12v-1l2.646-2.354a.5.5 0 01.63-.062l2.66 1.773 3.71-3.71z" />
                            <path
                                fillRule="evenodd"
                                d="M4.502 9a1.5 1.5 0 100-3 1.5 1.5 0 000 3zM4 2h10a1 1 0 011 1v8a1 1 0 01-1 1v1a2 2 0 002-2V3a2 2 0 00-2-2H4a2 2 0 00-2 2h1a1 1 0 011-1z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </td>
                    <td>{this.props.data.rews[i]}</td>
                    <td>{this.props.data.dones[i]}</td>
                    <td>
                        Action{' '}
                        <svg
                            className="bi bi-box-arrow-right"
                            width="1em"
                            height="1em"
                            viewBox="0 0 16 16"
                            fill="currentColor"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                d="M11.646 11.354a.5.5 0 010-.708L14.293 8l-2.647-2.646a.5.5 0 01.708-.708l3 3a.5.5 0 010 .708l-3 3a.5.5 0 01-.708 0z"
                                clipRule="evenodd"
                            />
                            <path
                                fillRule="evenodd"
                                d="M4.5 8a.5.5 0 01.5-.5h9a.5.5 0 010 1H5a.5.5 0 01-.5-.5z"
                                clipRule="evenodd"
                            />
                            <path
                                fillRule="evenodd"
                                d="M2 13.5A1.5 1.5 0 01.5 12V4A1.5 1.5 0 012 2.5h7A1.5 1.5 0 0110.5 4v1.5a.5.5 0 01-1 0V4a.5.5 0 00-.5-.5H2a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h7a.5.5 0 00.5-.5v-1.5a.5.5 0 011 0V12A1.5 1.5 0 019 13.5H2z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </td>
                </tr>
            );
        }

        return (
            <Table striped hover>
                <thead>{table_head}</thead>
                <tbody>{table}</tbody>
            </Table>
        );
    }

    scrollToRow(row_id) {
        if (row_id === undefined) return;

        const el = document.getElementById('tt_row_id' + String(row_id - 1));
        if (el) {
            const top_pos = el.offsetTop;
            this.scrollRef.current.scrollTop = top_pos;
        }
    }

    // Render the UI for your table
    render() {
        return (
            <div ref={this.scrollRef} className="trajectory_table_div">
                {this.createExperimentTable()}
            </div>
        );
    }
}
