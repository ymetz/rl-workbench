import ReactModal from 'react-modal';
import React, { Component } from 'react';
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
                        Welcome to the User Study for VISITOR
                        <FontAwesomeIcon style={{ float: 'right' }} icon={faTimes} onClick={this.props.closeModal} />
                    </h2>
                    <hr style={{ marginTop: '4px' }}></hr>
                </div>
                <div>
                    <p>Dear participant,</p>
                    <p>
                        Thank you very much for your participation! The goal of this study is to investigate an
                        interactive system for the analysis of agents trained via reinforcement learning. The estimated
                        study time is ~60-80 minutes.
                    </p>
                    <p>
                        <b>Please Read the following instructions carefully before starting the study!</b>
                    </p>
                    <hr></hr>
                    <h3>Schedule</h3>
                    <p>The study will be conducted in six phases:</p>
                    <ol>
                        <li> 1. Entry Questionare (~5min)</li>
                        <li> 2. General Familiarization with the tool (~10min)</li>
                        <li> 3. Explicit Task Solving (~20min)</li>
                        <li> Short Break (~5min)</li>
                        <li> 4. Second Task Solving Session (~20min)</li>
                        <li> 5. Closing Interview (~10min)</li>
                        <li> 6. Closing Questionaire (~10min)</li>
                    </ol>
                    <hr></hr>
                    <h3>Your Tasks</h3>
                    <p>What is asked from the participants</p>
                    <hr></hr>
                    <h3>Disclaimer & Data Protection</h3>
                    <p>
                        With participating in this study, you agree to us recording the screen and audio during the
                        session. Your face will not be recorded during the session. We will furthermore record your
                        answers to a short questionaire in this study. Your data will only be used and processed for the
                        study and will not be shared with anyone else. Future usage will only be permitted if you give
                        your consent. If you have any questions regarding data usage and protection, please feel free to
                        ask the study lead.
                    </p>
                </div>
            </ReactModal>
        );
    }
}

/*<InfoFooter method={this.state.method} />*/
