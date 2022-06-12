import React, { Component } from 'react';
import { Button, FormControl, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faStepBackward, faStepForward, faPlay, faBackward, faPause } from '@fortawesome/free-solid-svg-icons';

export default class step_player extends Component {
    constructor(props) {
        super(props);

        this.state = {
            play: false,
            replay_frameskip: 1,
        };
    }

    componentWillUnmount() {
        clearInterval(this.interval);
    }

    changeCurrentHighlightStep(new_steps) {
        const old_steps = this.props.stepState.new;
        let n_steps = { bottom: old_steps.bottom, top: old_steps.top, value: old_steps.value };
        if (new_steps) {
            for (const key in new_steps) {
                n_steps[key] = new_steps[key];
            }
        } else {
            if (old_steps.value < old_steps.top) {
                const new_value = old_steps.value + this.state.replay_frameskip;
                n_steps = { bottom: old_steps.bottom, top: old_steps.top, value: new_value };
            } else {
                const new_value = old_steps.bottom;
                n_steps = { bottom: old_steps.bottom, top: old_steps.top, value: new_value };
            }
        }
        this.props.setSteps(n_steps);
    }

    performStep(event) {
        const current = this.props.stepState.new;
        let new_value = current.value;
        let click_value;
        if (event.target.type === 'button') click_value = event.target.name;
        else click_value = event.target.title;
        switch (click_value) {
            case 'reset':
                new_value = current.bottom;
                break;
            case 'left':
                if (current.value - this.state.replay_frameskip >= current.bottom)
                    // do not overstep left bound of chosen interval
                    new_value = current.value - this.state.replay_frameskip;
                break;
            case 'right':
                if (current.value + this.state.replay_frameskip < current.top)
                    new_value = current.value + this.state.replay_frameskip;
                break;
            case 'play':
                const new_play = !this.state.play;
                this.setState({ play: new_play });
                if (new_play) this.interval = setInterval(() => this.changeCurrentHighlightStep(), 250);
                else clearInterval(this.interval);
                break;
        }

        this.changeCurrentHighlightStep({ bottom: current.bottom, top: current.top, value: new_value });
    }

    changeRenderFrameskip(event) {
        let new_frameskip = this.state.replay_frameskip; // set to default value
        if (event.target.value != '') {
            new_frameskip = Number(event.target.value);
        }
        this.setState({ replay_frameskip: new_frameskip });
    }

    render() {
        const renderTooltip = (props) => (
            <Tooltip id="button-tooltip" {...props}>
                Frameskip for Replay (e.g. for multi-agent envs)
            </Tooltip>
        );

        return (
            <div
                className={'setupstyles.range_header_div ' + (this.props.extraMargin ? 'setupstyles.extra_margin' : '')}
            >
                {!this.props.colapsed && (
                    <div className="setupstyles.player_left_button setupstyles.frameskip_input">
                        <OverlayTrigger placement="right" delay={{ show: 100, hide: 250 }} overlay={renderTooltip}>
                            <FormControl
                                name="render_frameskip"
                                size="sm"
                                placeholder={this.state.replay_frameskip}
                                key="render_frameskip"
                                onChange={this.changeRenderFrameskip.bind(this)}
                            />
                        </OverlayTrigger>
                    </div>
                )}
                <div className="setupstyles.player_left_button">
                    <Button variant="outline-info" onClick={this.performStep.bind(this)} name="reset">
                        <FontAwesomeIcon style={{ pointerEvents: 'none' }} icon={faBackward} title="reset" />
                    </Button>
                </div>
                <div className="setupstyles.player_left_button">
                    <Button onClick={this.performStep.bind(this)} variant="outline-secondary" name="left">
                        <FontAwesomeIcon style={{ pointerEvents: 'none' }} icon={faStepBackward} title="left" />
                    </Button>
                </div>
                <div className="setupstyles.player_paragraph">
                    {this.props.colapsed ? (
                        <p>
                            Step: <b>{this.props.stepState.new.value + 1}</b>
                        </p>
                    ) : (
                        <p>
                            Selected Range: <b>{this.props.stepState.new.bottom + 1}</b> -{' '}
                            <b>{this.props.stepState.new.top + 1}</b> Step: <b>{this.props.stepState.new.value + 1}</b>
                        </p>
                    )}
                </div>
                <div className="setupstyles.player_right_button">
                    <Button onClick={this.performStep.bind(this)} variant="outline-secondary" name="right">
                        <FontAwesomeIcon style={{ pointerEvents: 'none' }} icon={faStepForward} title="right" />
                    </Button>
                </div>
                <div className="setupstyles.player_right_button">
                    {this.state.play ? (
                        <Button onClick={this.performStep.bind(this)} variant="outline-danger" name="play">
                            <FontAwesomeIcon style={{ pointerEvents: 'none' }} icon={faPause} title="pause" />
                        </Button>
                    ) : (
                        <Button onClick={this.performStep.bind(this)} variant="outline-danger" name="play">
                            <FontAwesomeIcon
                                style={{ pointerEvents: 'none' }}
                                icon={faPlay}
                                title="play"
                                aria-hidden={true}
                            />
                        </Button>
                    )}
                </div>
            </div>
        );
    }
}
