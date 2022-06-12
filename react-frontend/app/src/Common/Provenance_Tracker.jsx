import React, { PureComponent } from 'react';
import { ListGroup, Button } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

export default class provenance_tracker extends PureComponent {
    constructor(props) {
        super(props);
    }

    getTrackingItems() {
        return Array.from(this.props.trackingItems.values(), (item, idx) => (
            <ListGroup.Item key={'item_' + item.tracking_id}>
                {idx + 1} | {item.exp_name} | {item.step_value + 1}{' '}
                <FontAwesomeIcon
                    style={{ float: 'right' }}
                    onClick={() => this.props.deleteTrackingItem(item.tracking_id)}
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
                <ListGroup>{this.getTrackingItems()}</ListGroup>
                <div className="setupstyles.center_button_div">
                    <Button
                        variant="success"
                        className="setupstyles.rounded_button"
                        onClick={this.props.addTrackingItem}
                        name="add item"
                        disabled={!this.props.buttonEnabled}
                    >
                        <FontAwesomeIcon
                            onClick={() => this.props.addTrackingItem(item.tracking_id)}
                            icon={faPlus}
                            title="left"
                            aria-hidden={true}
                        />{' '}
                        Add Selected
                    </Button>
                    <p className="setupstyles.grey_text">Number of items: {this.props.trackingItems.size}</p>
                    <p className="setupstyles.grey_text" style={{ fontSize: 12 }}>
                        After benchmarking an environment, select steps to add as test cases.
                    </p>
                </div>
            </div>
        );
    }
}
