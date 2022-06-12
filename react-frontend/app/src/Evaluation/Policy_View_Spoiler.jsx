import React from 'react';
import { Row, Col, Button } from 'react-bootstrap';
import 'rc-slider/assets/index.css';
import '../css/Evaluation.module.css';

/*
    Shows a centered text and right arrow to open the policy view if clicked.
*/

export default function Policy_View_Spoiler(props) {
    return (
        <Row className="align-items-center" className="policy_view_div">
            <Col>
                <p>Enable Policy View</p>
            </Col>
            <Col>
                <Button onClick={props.setShowPolicyView}>Open</Button>
            </Col>
        </Row>
    );
}
