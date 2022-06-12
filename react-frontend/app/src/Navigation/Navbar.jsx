import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { config } from '../app_config';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { ReactComponent as WorkbenchIcon } from '../assets/workbench_icon.svg';
import { faList, faSync, faQuestion } from '@fortawesome/free-solid-svg-icons';

function Navigation(props) {
    return (
        <Navbar fixed="top" bg="dark" variant="dark" style={{paddintTop: "5px", paddingBottom: "10px"}}>
            <Container style={{height: "3vh"}}>
                <Navbar.Brand as={Link} to={'/'} eventKey="home">
                    <WorkbenchIcon
                        alt=""
                        src="workbench_icon.svg"
                        width="30"
                        height="2vh"
                        className="d-inline-block align-top"
                        style={{ fill: '#FFFFFF', marginRight: '10px', marginTop: "5px" }}
                    />
                    {config.app_name}
                </Navbar.Brand>
                <Nav className="mr-auto">
                    <Nav.Item>
                        <Nav.Link as={Link} to={'/setup'} eventKey="setup">
                            Environment&amp;Dataset
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to={'/experiments'} eventKey="experiments">
                            Experiment Tracking
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to={'/evaluation'} eventKey="evaluation">
                            Evaluation
                        </Nav.Link>
                    </Nav.Item>
                    <Nav.Item>
                        <Nav.Link as={Link} to={'/tensorboard'} eventKey="tensorboard">
                            Tensorboard
                        </Nav.Link>
                    </Nav.Item>
                </Nav>
                <Navbar.Toggle />
                <Navbar.Collapse className="justify-content-end">
                    <Nav>
                        <Nav.Item>
                            <Nav.Link eventKey="projects">
                                <FontAwesomeIcon icon={faList} style={{ marginRight: '5px' }} />
                                Database Browser
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                    <Nav>
                        <Nav.Item>
                            <Nav.Link eventKey="update">
                                <FontAwesomeIcon icon={faSync} />
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                    <Nav>
                        <Nav.Item>
                            <Nav.Link onClick={props.toggleHelp}>
                                <FontAwesomeIcon icon={faQuestion} />
                            </Nav.Link>
                        </Nav.Item>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
}

export default Navigation;
