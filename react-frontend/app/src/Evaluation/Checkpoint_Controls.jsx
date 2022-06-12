import React, { useState, useRef, useEffect } from 'react';
import Slider from 'rc-slider';
import { Row, Col, Button } from 'react-bootstrap';
import 'rc-slider/assets/index.css';
import '../css/Evaluation.module.css';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause } from '@fortawesome/free-solid-svg-icons';

export default function checkpoint_Controls(props) {
    const checkpointTimesteps = props.checkpointTimesteps;
    const [play, setPlay] = useState(false);
    const [currentCheckpoint, setCurrentCheckpoint] = useState(0);
    const intervalRef = useRef(null);

    useEffect(() => {
        props.setSelectedCheckpoint(checkpointTimesteps[currentCheckpoint].value);
    }, [currentCheckpoint]);

    const performStep = () => {
        if (!play) {
            intervalRef.current.current = setInterval(
                () => setCurrentCheckpoint((currentCheckpoint) => (currentCheckpoint + 1) % checkpointTimesteps.length),
                1500
            );
        } else {
            clearInterval(intervalRef.current.current);
        }
        setPlay(!play);
    };

    return (
        <Row className="top_checkpoint_control_div">
            <Col md={2}>
                <p>Model Checkpoint Control: </p>
            </Col>
            <Col>
                <Slider
                    disabled={!props.sampledAllCheckpoints}
                    style={{ marginTop: 5 }}
                    dots={true}
                    min={0}
                    max={props.checkpointTimesteps.length}
                    steps={null}
                    value={currentCheckpoint}
                    onChange={(value) => {
                        setCurrentCheckpoint(value);
                    }}
                    marks={Object.fromEntries(checkpointTimesteps.map((ts, i) => [i, ts.label]))}
                />
            </Col>
            <Col md={1}>
                {play ? (
                    <Button onClick={performStep} variant="outline-danger" name="play">
                        <FontAwesomeIcon style={{ pointerEvents: 'none' }} icon={faPause} title="pause" />
                    </Button>
                ) : (
                    <Button onClick={performStep} variant="outline-danger" name="play">
                        <FontAwesomeIcon
                            style={{ pointerEvents: 'none' }}
                            icon={faPlay}
                            title="play"
                            aria-hidden={true}
                        />
                    </Button>
                )}
            </Col>
        </Row>
    );
}
