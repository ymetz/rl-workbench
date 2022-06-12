import React from 'react';
import '../css/Widgets.module.css';
import Spaces_Parallel_Histogram from './Spaces_Parallel_Histogram';
import Action_Probability_Diagram from './Action_Probability_Diagram';

const discrete_types = ['Discrete', 'MultiDiscrete'];

export default function detail_window(props) {
    if (!props.data) {
        return <div></div>;
    }

    // get step relative to bottom
    const post_filter_index = props.dataSteps.value - props.dataSteps.bottom;
    const data_point = props.data[Math.min(props.data.length, post_filter_index + 1)];

    let attr_data_point;
    if (props.attrData !== undefined && props.attrData.length > 0)
        attr_data_point = props.attrData[Math.min(props.attrData.length, post_filter_index + 1)];

    let probability_data_point;
    if (props.probabilities !== undefined && props.probabilities.length > 0)
        probability_data_point = props.probabilities[Math.min(props.probabilities.length, post_filter_index + 1)];

    let display_image = false;
    if (props.spaceInfo) display_image = props.spaceInfo.is_image;

    let return_type = 'obs';
    if (props.returnType === 'dataset_obs') return_type = 'dataset_obs';

    let channel_number = 0;
    if (display_image) channel_number = props.spaceInfo.shape[props.spaceInfo.shape.length - 1];

    return (
        <div>
            {Array.isArray(data_point) && props.spaceInfo && !display_image ? (
                <div>
                    <Spaces_Parallel_Histogram
                        data={data_point}
                        attrData={attr_data_point}
                        isAttribution={props.isAttribution}
                        selectedDimension={props.selectedDimension}
                        spaceInfo={props.spaceInfo}
                        width={props.width}
                        lineColor={props.lineColor}
                    />
                </div>
            ) : (
                <div>
                    {display_image ? (
                        /*<div>
                                {Array.from({ length: Math.min(1, channel_number) }, (x, i) => -i - 1).reverse().map((d) => {
                                    return <img style={{ marginLeft: "2px", marginRight: "2px" }} width={140} key={"img"+Math.random()} src={"/routing/get_single_obs?step=" + props.dataSteps.value + "&channels=[" + d + "]&type=obs&rdn=" + Math.random()}></img>
                                })}
                                {channel_number > 4 && <p>Only the last 3 channels will be displayed</p>}
                                {props.showExplanation && <img width={280} key={"img"+Math.random()} src={"/routing/get_single_obs?step=" + props.dataSteps.value + "&channels=[]&type=attr&rdn=" + Math.random()}></img>}
                            </div>*/
                        <div>
                            {props.showExplanation && (
                                <img
                                    width={250}
                                    src={
                                        '/routing/get_single_obs?step=' +
                                        props.dataSteps.value +
                                        '&channels=[]&type=attr&rdn=' +
                                        Math.random()
                                    }
                                ></img>
                            )}
                        </div>
                    ) : (
                        <div>
                            {probability_data_point !== undefined ? (
                                <Action_Probability_Diagram
                                    data={data_point}
                                    probabilities={probability_data_point}
                                    spaceInfo={props.spaceInfo}
                                    chooseAction={props.chooseAction}
                                />
                            ) : (
                                <p>
                                    <b>
                                        {data_point}{' '}
                                        {props.spaceInfo &&
                                            Number.isInteger(data_point) &&
                                            '(' + props.spaceInfo['tag_' + data_point] + ')'}
                                    </b>
                                </p>
                            )}
                        </div>
                    )}
                </div>
            )}
            {props.spaceInfo && props.spaceInfo.dimensions && (
                <div>
                    Space:{' '}
                    <b>
                        {props.spaceInfo.type +
                            '(' +
                            (props.spaceInfo.type === 'Discrete'
                                ? props.spaceInfo.n
                                : props.spaceInfo.dimensions.join(',')) +
                            ')'}
                    </b>
                </div>
            )}
        </div>
    );
}
