import React, { Component } from 'react';
import { Col, Form, Button } from 'react-bootstrap';

export default class TaskSubmitForm extends Component {
    constructor(props) {
        super(props);

        const item_input_values = {};

        this.state = {
            inputFormValidated: false,
            item_input_values: Object.assign({}, item_input_values),
            copy_time_stamp: 0,
        };
    }

    componentDidUpdate() {
        if (this.props.copyTimeStamp > this.state.copy_time_stamp) {
            this.setState({
                copy_time_stamp: this.props.copyTimeStamp,
                item_input_values: Object.assign({}, this.props.copyTask),
            });
        }
    }

    handleTaskSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        if (form.checkValidity() == true) {
            this.props.submitTask({
                type: form.elements.type.value,
                nrOfPlaceholders: form.elements.nrOfPlaceholders.value,
                isInteractive: form.elements.isInteractive.value,
                sipFactor: form.elements.sipFactor.value,
                taskStrings: Object.fromEntries(
                    Object.keys(this.props.supportedLanguages).map((lang) => [
                        lang,
                        form.elements['taskString_' + lang].value,
                    ])
                ),
            });
        }

        this.setState({ inputFormValidated: true });
    }

    changeFormValue(form_element, event) {
        const new_item = this.state.item_input_values;
        new_item[form_element] = event.target.value;
        this.setState({ item_input_values: new_item });
    }

    getFormElementList() {
        console.log(this.state.item_input_values);
        return Object.keys(this.state.item_input_values).map((key) => {
            return (
                <Form.Group control="validate_type">
                    <Form.Label>{key}</Form.Label>
                    <Form.Control
                        type="text"
                        name={key}
                        value={this.state.item_input_values[key]}
                        onChange={this.changeFormValue.bind(this, key)}
                    />
                    <Form.Text className="text-muted">
                        Change available options in <i>app_config.js</i>
                    </Form.Text>
                </Form.Group>
            );
        });
    }

    render() {
        return (
            <Col style={{ paddingLeft: 25, paddingRight: 25 }}>
                <h3>Add task</h3>
                <Form noValidate validated={this.state.inputFormValidated} onSubmit={this.handleTaskSubmit.bind(this)}>
                    {this.getFormElementList()}
                    <Button type="submit">Submit to table: {this.props.itemType}</Button>
                    <Form.Text className="text-muted">Take care. Entry is not validated on submit.</Form.Text>
                </Form>
            </Col>
        );
    }
}
