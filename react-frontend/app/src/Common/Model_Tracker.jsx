import React, { PureComponent } from 'react';
import { ListGroup } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus } from '@fortawesome/free-solid-svg-icons';

export default class model_tracker extends PureComponent {
    constructor(props) {
        super(props);
    }

    getTrackingItems() {
        return Array.from(this.props.benchmarkedModels.values(), (item, idx) => (
            <ListGroup.Item key={'item_' + item.model_id}>
                {idx + 1} | {item.model_name} | {item.checkpoint_step}{' '}
                <FontAwesomeIcon
                    style={{ float: 'right' }}
                    onClick={() => this.props.deleteModel(item.model_id)}
                    icon={faMinus}
                    title="left"
                    aria-hidden={true}
                />
            </ListGroup.Item>
        ));
    }

    render() {
        return (
            <div>
                <p>ID | Model Name | Checkpoint Step</p>
                <ListGroup>{this.getTrackingItems()}</ListGroup>
                <div className="setupstyles.center_button_div">
                    <p className="setupstyles.grey_text">
                        Number of models/checkpoints: {this.props.deleteModel.length}
                    </p>
                </div>
            </div>
        );
    }
}
