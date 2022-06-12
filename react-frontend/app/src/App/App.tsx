import React, { useEffect, useState } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Setup_Main from '../Setup/Setup_Main';
import Experiment_Tracking_Main from '../Experiment_Tracking/Experiment_Tracking_Main';
import Evaluation_Main from '../Evaluation/Evaluation_Main';
import Navigation from '../Navigation/Navbar';
import Help_Modal from '../Navigation/Help_Modal';
import Tensorboard_Iframe from '../Experiment_Tracking/Tensorboard_Iframe';
import Visualization from 'App/Visualization';

function App() {
    const [showHelpModal, setShowHelpModal] = useState(false);

    return (
        <div id="app" className="App">
                <BrowserRouter>
                    <Navigation toggleHelp={setShowHelpModal} />
                    <Routes>
                        <Route path="/" element={<Setup_Main />} />
                        <Route path="/setup" element={<Setup_Main />} />
                        <Route path="/experiment_tracking" element={<Experiment_Tracking_Main />} />
                        <Route path="/evaluation" element={<Evaluation_Main />} />
                        <Route path="/tensorboard" element={<Tensorboard_Iframe />} />
                    </Routes>
                </BrowserRouter>
            {showHelpModal && <Help_Modal isOpen={showHelpModal} closeModal={setShowHelpModal} />}
        </div>
    );
}

export default App;
