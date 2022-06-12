import ReactModal from 'react-modal';
import React, { Component } from 'react';
import { Figure } from 'react-bootstrap';
ReactModal.setAppElement('#root');
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';

/**
 * Overlay Compoment that is displayed to analyse a single image.
 */
export default class HelpModal extends Component {
    render() {
        return (
            <ReactModal
                isOpen={true}
                contentLabel="onRequestClose Example"
                style={{ content: { marginTop: '20px', width: '80%', left: '10%', zIndex: 5 } }}
            >
                <div>
                    <h2 className="setupstyles.modal_top_heading">
                        How to Use: Visual Analytics for Reinforcement and Imitation Learning
                        <FontAwesomeIcon style={{ float: 'right' }} icon={faTimes} onClick={this.props.closeModal} />
                    </h2>
                    <hr style={{ marginTop: '4px' }}></hr>
                </div>
                <div>
                    <p>
                        The following tool is designed to assist experiments in Reinforcement and Imitation Learning. VA
                        for Deep RL currently supports the <b>Stable Baselines</b> library.
                    </p>
                    <p>It supports the user in each stage of the experiment process: </p>
                    <ol>
                        <li>Setup and Analysis of the environment or dataset</li>
                        <li>Supervising training runs and performance. Comapare training algorithms & environments.</li>
                        <li>
                            Analysis & Validation of trained agents. Support of seperate validation environments to test
                            generalization.
                        </li>
                    </ol>
                    <hr></hr>
                    <h3>Tool Workflow</h3>
                    <p>
                        The basic concepts and terms of Reinforcement Learning. This tool guides users through all
                        relevant steps:
                    </p>
                    <Figure>
                        <Figure.Image width={'70%'} src="/public/images/Workflow.PNG" />
                        <Figure.Caption>The three phases of the RL/IL workflow.</Figure.Caption>
                    </Figure>
                    <hr></hr>
                    <h3>0. Basic concepts</h3>
                    <p>The basic concepts and terms of Reinforcement Learning:</p>
                    <Figure>
                        <Figure.Image width={'70%'} src="/public/images/RL_Explainer_Graphic.jpg" />
                        <Figure.Caption>
                            The basic "control loop" of reinforcement and imitation learning.
                        </Figure.Caption>
                    </Figure>
                    <ul>
                        <li>
                            <b>Agent/Algorithm:</b> The agent acts autonomously in an environment and makes decisions.
                            Which decision to make is decided by an algorithm or trained model (neural network).
                        </li>
                        <li>
                            <b>Environment:</b>Often a simulation, the environment contains the problem setting, and is
                            explored by the agent.
                        </li>
                        <li>
                            <b>Observation:</b>The agent can (partly) observe the state of the environment. The
                            observations are passed in a specific format, called the observation space, to the agent.
                        </li>
                        <li>
                            <b>Action:</b>The agent decides to perform an action in the environment. The Similarly to
                            the observation, actions are passed to the simulation in a specified format, the action
                            space.
                        </li>
                        <li>
                            <b>Reward:</b>In each step, the agent receives a reward signal. This reward signal codifies
                            the goal the agent has to achieve in the environment.
                        </li>
                        <li>
                            <b>Reinforcement Learning:</b>In reinforcement learning, the agent tries to maximize the
                            total reward it receives. It does this by trial-and-error, i.e. the algorithm learns a model
                            which outputs actions that maximize the expected return.
                        </li>
                        <li>
                            <b>Imitation Learning:</b>In imitation learning, the actions an agent should take in
                            different states of the environment are given by a supplied dataset.
                        </li>
                    </ul>
                    <hr></hr>
                    <h3>1. Setup</h3>
                    <Figure>
                        <Figure.Image width={'70%'} src="/public/images/Setup_Page_View.PNG" />
                        <Figure.Caption>
                            Interface of the setup page. On the left-hand side, initialize and customize a training,
                            benchmark an environment and start a training.
                        </Figure.Caption>
                    </Figure>
                    <hr></hr>
                    <h3>2. Run Browser/Training</h3>
                    <Figure>
                        <Figure.Image width={'70%'} src="/public/images/Run_Browser.PNG" />
                        <Figure.Caption>
                            Interface of the run browser page. Browse training runs by selecting them on the right, zoom
                            & pan in the graph. The table can be sorted and searched by tags and keywords.
                        </Figure.Caption>
                    </Figure>
                    <hr></hr>
                    <h3>3. Evaluation</h3>
                    <Figure>
                        <Figure.Image width={'70%'} src="/public/images/Evaluation.PNG" />
                        <Figure.Caption>
                            Interface of the evaluation page. Benchmark trained agents with a chosen timestep.
                        </Figure.Caption>
                    </Figure>
                    <hr></hr>
                    <h3>Optional Code Interface</h3>
                    <Figure>
                        <Figure.Image width={'70%'} src="/public/images/Code_Interface.PNG" />
                        <Figure.Caption>Optionally, Experiment Runs can be started via Python.</Figure.Caption>
                    </Figure>
                </div>
            </ReactModal>
        );
    }
}

/*<InfoFooter method={this.state.method} />*/
