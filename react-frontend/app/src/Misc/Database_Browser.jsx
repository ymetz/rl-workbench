import React, { useState } from 'react';

import { project_schema, environments_schema, experiments_schema } from './database_schemas';
import Database_Browser_Table from './Database_Browser_Table.jsx';
import { Col, Row, Dropdown } from 'react-bootstrap';
export default function Database_Browser() {
    const [table, setTable] = useState('projects');

    return (
        <Col>
            <h1>Database Browser</h1>
            <Row>
                <Col md="2">
                    <Dropdown>
                        <Dropdown.Toggle variant="success" id="dropdown-basic">
                            Select Table
                        </Dropdown.Toggle>
                        <Dropdown.Menu>
                            <Dropdown.Item onClick={() => setTable('projects')}>Registered Projects</Dropdown.Item>
                            <Dropdown.Item onClick={() => setTable('environments')}>
                                Registered Environments
                            </Dropdown.Item>
                            <Dropdown.Item onClick={() => setTable('experiments')}>
                                Registered Experiments
                            </Dropdown.Item>
                        </Dropdown.Menu>
                    </Dropdown>
                </Col>
                <Col>Currently Selected: {table}</Col>
            </Row>
            <hr />
            {
                {
                    projects: <Database_Browser_Table schema={project_schema} table={table} />,
                    environments: <Database_Browser_Table schema={environments_schema} table={table} />,
                    experiments: <Database_Browser_Table schema={experiments_schema} table={table} />,
                }[table]
            }
        </Col>
    );
}
