import React, { PureComponent } from 'react';
import { DropdownButton, ButtonGroup, Dropdown, Button } from 'react-bootstrap';
import '../css/Evaluation.module.css';
import * as d3 from 'd3';

export default class Embedding_rewardgrapg extends PureComponent {
    constructor(props) {
        super(props);
        this.linegraphRef = React.createRef();

        this.state = {
            processed_data: { rews: [], dones: [] },
            processed_sec_data: [],
            rew_aggr_mode: 'acc_reward',
            sec_data_type: 'random',
            xbrush_bounds: [],
        };
    }

    rewAggrModeToLabel = {
        step_reward: 'Step Reward',
        acc_reward: 'Accumulated Reward',
        real_value: 'Real Value',
    };

    componentDidMount() {
        this.drawChart(
            this.prepareData(this.props.data),
            this.getSecData(),
            this.props.lineColor,
            this.props.changeHighlight,
            this.props.highlightSteps,
            this.props.hideNewStepRange,
            this.props.highlightStepRange,
            this.props.highlightHiddenMap,
            this.setXBounds.bind(this),
            this.props.excludedEpisodes,
            this.props.updateExcludedEpisodes,
            this.props.updateExcludedEpisodesMultiple,
            this.props.episodeRewards,
            this.props.episodeLengths,
            this.props.episodeCheckpointMap,
            this.state.sec_data_type
        );
    }

    componentDidUpdate(prevProps, prevState) {
        if (this.props.data.length > 0 && this.state.xbrush_bounds.length <= 0) {
            //    if (this.state.xbrush_bounds.length <= 0)
            let data = this.state.processed_data;
            let sec_data = this.state.processed_sec_data;
            if (
                this.props.dataTimestamp !== prevProps.dataTimestamp ||
                this.state.rew_aggr_mode !== prevState.rew_aggr_mode ||
                this.state.sec_data_type !== prevState.sec_data_type
            ) {
                data = this.prepareData(this.props.data);
                sec_data = this.getSecData();
                this.setState({ processed_data: data, processed_sec_data: sec_data });
            }
            this.drawChart(
                data,
                sec_data,
                this.props.lineColor,
                this.props.changeHighlight,
                this.props.highlightSteps,
                this.props.hideNewStepRange,
                this.props.highlightStepRange,
                this.props.highlightHiddenMap,
                this.setXBounds.bind(this),
                this.props.excludedEpisodes,
                this.props.updateExcludedEpisodes,
                this.props.updateExcludedEpisodesMultiple,
                this.props.episodeRewards,
                this.props.episodeLengths,
                this.props.episodeCheckpointMap,
                this.state.sec_data_type
            );
        }
    }

    getSecData() {
        if (this.state.sec_data_type === 'random') {
            if (this.props.comparisonRewardCurve.length > 0) return this.props.comparisonRewardCurve;
            else return [0];
        }
        return this.props.infos.map((i) => i[this.state.sec_data_type]);
    }

    prepareData(data) {
        const rew_data = data[0];
        const done_data = data[1];
        let out_data = new Array(rew_data.length);
        if (this.state.rew_aggr_mode === 'step_reward') {
            out_data = rew_data;
        } else if (this.state.rew_aggr_mode === 'acc_reward') {
            let current_sum = 0.0;
            for (let i = 0; i < rew_data.length; i++) {
                current_sum += rew_data[i];
                out_data[i] = current_sum;
                if (done_data[i] === true) current_sum = 0.0;
            }
        } else if (this.state.rew_aggr_mode === 'real_value') {
            let current_sum = 0.0;
            for (let i = rew_data.length - 1; i >= 0; i--) {
                current_sum += rew_data[i];
                out_data[i] = current_sum;
                if (done_data[i] === true) current_sum = 0.0;
            }
        }

        const done_idx = done_data.reduce((a, elem, i) => (elem === true && a.push(i), a), []);

        return { rews: out_data, dones: done_idx };
    }

    changeRewardAggrMode(new_mode) {
        const mode = new_mode;
        this.setState({ rew_aggr_mode: mode });
    }

    changeSecondaryDataType(new_type) {
        const type = new_type;
        this.setState({ sec_data_type: type });
    }

    getSecDataTypes() {
        return this.props.infoTypes.map((type, i) => {
            return (
                <Dropdown.Item key={type} eventKey={type} active={this.state.sec_data_type === type}>
                    {type}
                </Dropdown.Item>
            );
        });
    }

    setXBounds(bounds) {
        this.setState({ xbrush_bounds: bounds });
    }

    hideBrushSelection() {
        this.props.hideNewStepRange(this.state.xbrush_bounds);
        this.setState({ xbrush_bounds: [] });
    }

    highlightBrushSelection() {
        this.props.highlightStepRange(this.state.xbrush_bounds);
        this.setState({ xbrush_bounds: [] });
    }

    resetRewardFilterHighlighting() {
        this.setState({ xbrush_bounds: [] });
        this.props.resetHighlightingFilter();
    }

    drawChart(
        data,
        sec_data,
        lineColor,
        changeHighlight,
        highlightSteps,
        hideNewStepRange,
        highlightNewStepRange,
        highlightHiddenMap,
        setXBounds,
        excludedEpisodes,
        updateExcludedEpisodes,
        updateExcludedEpisodesMultiple,
        episodeRewards,
        episodeLengths,
        episodeCheckpointMap,
        secDataName
    ) {
        const { rews, dones } = data;

        const margin = { top: 10, right: 30, bottom: 20, left: 10 };
        const svgWidth = this.linegraphRef.current.parentElement.clientWidth - margin.left - margin.right;
        const svgHeight = 305;
        const lowerOverlayHeight = 120;
        const reward_graph_height = svgHeight - lowerOverlayHeight;
        const x_domain = rews.length > 0 ? rews.length - 1 : 1024;

        d3.select(this.linegraphRef.current.current).select('*').remove();
        d3.select('#rewardAggregationFunctionHighlightButton').attr('disabled', true);
        d3.select('#rewardAggregationFunctionHideButton').attr('disabled', true);

        const svg = d3
            .select(this.linegraphRef.current.current)
            .append('svg')
            .attr('width', svgWidth + margin.left + margin.right)
            .attr('height', svgHeight + margin.top + margin.bottom)
            .append('g')
            .attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

        const x = d3
            .scaleLinear()
            .domain([highlightSteps.previous.bottom, highlightSteps.previous.top])
            .range([0, svgWidth]);
        const xAxis = svg.append("g")
            .attr("transform", "translate(0," + reward_graph_height + ")")
            .call(d3.axisBottom(x));

        const min_val = Math.min(d3.min(rews), d3.min(sec_data));
        const max_val = Math.max(d3.max(rews), d3.max(sec_data));
        const y_domain =
            rews.length > 0 ? [min_val - 0.15 * Math.abs(min_val), max_val + 0.15 * Math.abs(max_val)] : [-1, 1];
        const y = d3
            .scaleLinear()
            .range([svgHeight - lowerOverlayHeight, 0])
            .domain(y_domain);
        // Gradient Color Scale for Line, min-max normalization
        const gradientColor = (d) => {
            return d3.interpolateOrRd((d-y_domain[0])/(y_domain[1]-y_domain[0]));
            };

        svg.append('g')
            .call(d3.axisRight(y).ticks(5).tickSize(svgWidth))
            .call((g) => g.select('.domain').remove())
            .call((g) => g.selectAll('.tick:not(:first-of-type) line').attr('stroke-opacity', 0.3))
            .call((g) => g.selectAll('.tick text').attr('x', 4).attr('dy', -4));

        const brush = d3.brushX()
            .extent([[0, 0], [svgWidth, reward_graph_height]])
            .on("end", brushSelection);

        svg.append('line')
            .attr('x1', svgWidth - margin.right - 40)
            .attr('y1', 16)
            .attr('x2', svgWidth - margin.right - 35)
            .attr('y2', 16)
            .attr('stroke-width', 3)
            .attr('stroke', '#75aaff');

        svg.append('line')
            .attr('x1', svgWidth - margin.right - 110)
            .attr('y1', 16)
            .attr('x2', svgWidth - margin.right - 105)
            .attr('y2', 16)
            .attr('stroke-width', 3)
            .attr('stroke', lineColor);

        svg.append('text')
            .attr('x', svgWidth - margin.right - 30)
            .attr('y', 20)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text(secDataName);

        svg.append('text')
            .attr('x', svgWidth - margin.right - 100)
            .attr('y', 20)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Reward');

        svg.append('text')
            .attr('x', x(2))
            .attr('y', reward_graph_height + 30)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Episodes (with total in-game rewards)');

        const done_lines = svg.append("g")
            .selectAll("line")
            .data(dones)
            .enter()
            .append("line")
            .attr("x1", d => x(d))
            .attr("x2", d => x(d))
            .attr("y1", 0)
            .attr("y2", svgHeight)
            .attr("stroke", "#a0a0a0");

        const episode_select_rects = svg.append("g")
            .selectAll("rect")
            .data([0].concat(dones).slice(0, -1))
            .enter()
            .append("rect")
            .attr("x", d => x(d) + 2)
            .attr("y", reward_graph_height + 35)
            .attr("height", 20)
            .attr("width", (d,i) => x(dones[i]) - x(d) - 3)
            .attr("fill", (_, i) => d3.interpolateSpectral(i / dones.length))
            .attr("opacity", (_, i) => excludedEpisodes.includes(i) ? 0.5 : 0.95)
            .on("click", (d, i) => updateExcludedEpisodes(i));

        const padded_dones = [0].concat(dones);
        const episodes_per_run = dones.length / episodeRewards.length;
        const episode_reward_texts = svg.append("g")
            .selectAll("text")
            .data((episodeRewards))
            .enter()
            .append("text")
            //.attr("x", (d, i) => (x(padded_dones[i*episodes_per_run]) + (x(padded_dones[i*episodes_per_run+1]) - x(padded_dones[i*episodes_per_run])) / 2) + 10)
            .attr("x", (d, i) => x(padded_dones[i*episodes_per_run+episodes_per_run]) - 5)
            .attr("y", reward_graph_height + 50)
            .style("font-size", "13px")
            .attr("text-anchor", "end")
            .text(d =>  " <-" + Number.parseFloat(d).toFixed(2));

        svg.append('text')
            .attr('x', x(2))
            .attr('y', reward_graph_height + 65)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Checkpoints');

        const episodes_per_checkpoint = dones.length / episodeCheckpointMap.size;
        const checkpoint_rects = svg.append("g")
            .selectAll("rect")
            .data(Array.from(episodeCheckpointMap.keys()))
            .enter()
            .append("rect")
            .attr("x", (d, i) => x(padded_dones[i*episodes_per_checkpoint]) + 2)
            .attr("y", reward_graph_height + 70)
            .attr("height", 20)
            .attr("width", (d, i) => x(padded_dones[i*episodes_per_checkpoint+episodes_per_checkpoint]) - x(padded_dones[i*episodes_per_checkpoint]) - 3)
            .attr("fill", "#AAAAAA")
            .on("click",function (d, i) {
                if (!d3.select(this).classed("deactivated")) {
                    d3.select(this).attr("opacity", 0.5);
                    d3.select(this).classed("deactivated", true);
                    updateExcludedEpisodesMultiple(episodeCheckpointMap[i], true);
                } else {
                    d3.select(this).attr("opacity", 0.95);
                    d3.select(this).classed("deactivated", false);
                    updateExcludedEpisodesMultiple(episodeCheckpointMap[i], false);
                }
            });

        const checkpoint_texts = svg.append("g")
            .selectAll("text")
            .data(Array.from(episodeCheckpointMap.keys()))
            .enter()
            .append("text")
            //.attr("x", (d, i) => (x(padded_dones[i*episodes_per_run]) + (x(padded_dones[i*episodes_per_run+1]) - x(padded_dones[i*episodes_per_run])) / 2) + 10)
            .attr("x", (d, i) => x(padded_dones[i*episodes_per_checkpoint+episodes_per_checkpoint]) -5 )
            .attr("y", reward_graph_height + 85)
            .style("font-size", "13px")
            .attr("text-anchor", "end")
            .text(d =>  "Checkpoint: " + d);

        svg.append('text')
            .attr('x', x(2))
            .attr('y', reward_graph_height + 100)
            .attr('text-anchor', 'start')
            .style('font-size', '12px')
            .style('font-weight', 'bold')
            .text('Models');

        const model_rects = svg.append("g")
            .selectAll("rect")
            .data(Array.from(episodeCheckpointMap.keys()))
            .enter()
            .append("rect")
            .attr("x", x(0))
            .attr("y", reward_graph_height + 100)
            .attr("height", 20)
            .attr("width", svgWidth )
            .attr("fill", "#EEEEEE")
            .attr("opacity", "0.8");

        const data_path = svg
            .append("path")
            .datum(rews)
            .attr("fill", "none")
            .attr("stroke", lineColor)
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d, i) { return x(i); })
                .y(function (d) { return y(d); })
            );

        svg.append('g').attr('class', 'brush').call(brush);

        const step_line_g = svg.append("g");

        const step_line = step_line_g
            .append("rect")
            .attr("x", x(highlightSteps.new.value) - 2)
            .attr("y", 0)
            .attr("height", svgHeight)
            .attr("width", 4)
            .attr("fill", "#ff3737")
            .attr("opacity", 0.6);

        const step_line_point = step_line_g
            .append("circle")
            .attr("cx", x(highlightSteps.new.value))
            .attr("cy", y(rews[highlightSteps.new.value]))
            .attr("r", 8)
            .attr("opacity", 0.6)
            .attr("fill", "#ff3737")
            .call(d3.drag()
                .on("drag", dragPoint)
                .on('end', dragEnd));

        const comp_line = svg
            .append("path")
            .datum(sec_data)
            .attr("fill", "none")
            .attr("stroke", "#75aaff")
            .attr("stroke-width", 1.5)
            .attr("d", d3.line()
                .x(function (d, i) { return x(i); })
                .y(function (d) { return y(d); })
            );

        const hiddenStepRanges = [];
        const highlightedStepRanges = [];

        let hiddenActiveStart = -1;
        let highlightedActiveStart = -1;

        for (let i = 0; i < (data.rews.length === 0 ? 0 : data.rews.length + 1); i++) {
            const current = highlightHiddenMap[i];

            if (hiddenActiveStart > -1) {
                if (current === -1) continue;

                hiddenStepRanges.push([hiddenActiveStart, i - 1]);
                hiddenActiveStart = -1;

                if (current === 1) highlightedActiveStart = i;
            } else if (highlightedActiveStart > -1) {
                if (current === 1) continue;

                highlightedStepRanges.push([highlightedActiveStart, i - 1]);
                highlightedActiveStart = -1;

                if (current === -1) hiddenActiveStart = i;
            } else {
                if (current === -1) hiddenActiveStart = i;
                else if (current === 1) highlightedActiveStart = i;
            }
        }

        const hiddenAreas = svg
            .append("g")
            .selectAll("rect")
            .data(hiddenStepRanges)
            .enter()
            .append('rect')
            .attr('x', d => x(d[0]))
            .attr('y', 0)
            .attr('width', d => x(d[1] - d[0]))
            .attr('height', svgHeight - lowerOverlayHeight)
            .attr('fill', 'red')
            .attr('opacity', 0.2);

        const highlightedAreas = svg
            .append("g")
            .selectAll("rect")
            .data(highlightedStepRanges)
            .enter()
            .append('rect')
            .attr('x', d => x(d[0]))
            .attr('y', 0)
            .attr('width', d => x(d[1] - d[0]))
            .attr('height', svgHeight - lowerOverlayHeight)
            .attr('fill', 'yellow')
            .attr('opacity', 0.2);

        if (
            highlightSteps.new &&
            (highlightSteps.new.bottom !== highlightSteps.previous.bottom ||
                highlightSteps.new.top !== highlightSteps.previous.top)
        ) {
            x.domain([highlightSteps.new.bottom, highlightSteps.new.top]);
            svg.select('.brush').call(brush.move, null);

            // Update axis and circle position
            xAxis.transition().duration(750).call(d3.axisBottom(x));

            data_path
                .transition()
                .duration(750)
                .attr(
                    'd',
                    d3
                        .line()
                        .x(function (d, i) {
                            return x(i);
                        })
                        .y(function (d) {
                            return y(d);
                        })
                );

            done_lines
                .transition()
                .duration(750)
                .attr('x1', (d) => x(d))
                .attr('x2', (d) => x(d));

            comp_line
                .transition()
                .duration(750)
                .attr(
                    'd',
                    d3
                        .line()
                        .x(function (d, i) {
                            return x(i);
                        })
                        .y(function (d) {
                            return y(d);
                        })
                );

            step_line.transition().duration(750).attr('x', x(highlightSteps.new.value));
            step_line_point.transition().duration(750).attr('cx', x(highlightSteps.new.value));
        }

        function dragPoint() {
            const mousePos = d3.pointer(this);
            step_line.attr('x', mousePos[0]);
            step_line_point.attr('cx', mousePos[0]).attr('cy', mousePos[1]);
        }

        function dragEnd() {
            const mouseX = d3.pointer(this)[0];
            const x0 = Math.round(x.invert(mouseX));
            changeHighlight({ bottom: highlightSteps.new.bottom, top: highlightSteps.new.top, value: x0 });
        }

        function mouseover() {
            focus.style('opacity', 1);
            focusText.style('opacity', 1);
        }

        function mousemove() {
            const mouseX = d3.pointer(this)[0];
            const x0 = Math.round(x.invert(mouseX));
            const selectedData = rews[x0];
            focus.attr('cx', x(x0)).attr('cy', y(selectedData));
            focusText
                .html('step: ' + (x0 + 1) + ' reward: ' + selectedData.toFixed(2))
                .attr('x', x(x0) + 10)
                .attr('y', y(selectedData));
            if (mouseX < svgWidth / 2) {
                focusText.attr('text-anchor', 'start');
            } else {
                focusText.attr('text-anchor', 'end');
            }
        }

        function mouseout() {
            focus.style('opacity', 0);
            focusText.style('opacity', 0);
        }

        function mouseclick() {
            const x0 = Math.round(x.invert(d3.pointer(this)[0]));
            changeHighlight({ bottom: 0, top: 1024, value: x0 });
            focus.style('opacity', 0);
            focusText.style('opacity', 0);
        }

        let idleTimeout;
        function idled() {
            idleTimeout = null;
        }

        function updateChart(event) {
            const extent = event.selection;

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if (!extent) {
                if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350)); // This allows to wait a little bit
                changeHighlight({ bottom: 0, top: x_domain, value: 0 });
            } else {
                changeHighlight({
                    bottom: Math.floor(x.invert(extent[0])),
                    top: Math.floor(x.invert(extent[1])),
                    value: Math.floor(x.invert(extent[0])),
                });
            }
        }

        function brushSelection(event) {
            const extent = event.selection;

            // If no selection, back to initial coordinate. Otherwise, update X axis domain
            if (!extent) {
                if (!idleTimeout) return (idleTimeout = setTimeout(idled, 350)); // This allows to wait a little bit
                setXBounds([]);
            } else {
                setXBounds([Math.round(x.invert(extent[0])), Math.round(x.invert(extent[1]))]);
            }
        }
    }

    render() {
        return (
            <div>
                <DropdownButton
                    as={ButtonGroup}
                    key="reward_aggregation_dropdown"
                    id="reward_aggregation_dropdown_"
                    onSelect={this.changeRewardAggrMode.bind(this)}
                    className="rew_agg_dropdown_button"
                    variant="link"
                    title={'Reward Aggregation Mode: ' + this.rewAggrModeToLabel[this.state.rew_aggr_mode]}
                >
                    <Dropdown.Item eventKey="step_reward" active={this.state.rew_aggr_mode === 'step_reward'}>
                        Step Reward
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="acc_reward" active={this.state.rew_aggr_mode === 'acc_reward'}>
                        Accumulative Reward
                    </Dropdown.Item>
                    <Dropdown.Item eventKey="real_value" active={this.state.rew_aggr_mode === 'real_value'}>
                        Future Acc. Reward (Value)
                    </Dropdown.Item>
                </DropdownButton>
                <Button
                    variant="secondary"
                    id="rewardAggregationFunctionHighlightButton"
                    disabled={this.state.xbrush_bounds.length === 0}
                    onClick={this.highlightBrushSelection.bind(this)}
                >
                    Highlight
                </Button>
                &nbsp;
                <Button
                    variant="secondary"
                    id="rewardAggregationFunctionHideButton"
                    disabled={this.state.xbrush_bounds.length === 0}
                    onClick={this.hideBrushSelection.bind(this)}
                >
                    Hide
                </Button>
                &nbsp;
                <Button
                    variant="secondary"
                    id="rewardAggregationFunctionResetButton"
                    onClick={this.resetRewardFilterHighlighting.bind(this)}
                >
                    Reset
                </Button>
                &nbsp;
                <Button
                    variant="secondary"
                    id="rewardAggregationFunctionResetButton"
                    onClick={this.props.toggleExclusion}
                >
                    Toggle All
                </Button>
                &nbsp;
                <DropdownButton
                    as={ButtonGroup}
                    key="sec_dropdown"
                    id="reward_sec_dropdown"
                    onSelect={this.changeSecondaryDataType.bind(this)}
                    className="rew_agg_dropdown_button"
                    style={{ float: 'right' }}
                    variant="link"
                    title={
                        'Secondary Curve: ' +
                        (this.state.sec_data_type === 'random'
                            ? 'Reward with Random Actions'
                            : this.state.sec_data_type)
                    }
                >
                    <Dropdown.Item eventKey="random" active={this.state.sec_data_type === 'random'}>
                        Reward with Random Actions
                    </Dropdown.Item>
                    {this.getSecDataTypes()}
                </DropdownButton>
                <div ref={this.linegraphRef}></div>
            </div>
        );
    }
}
