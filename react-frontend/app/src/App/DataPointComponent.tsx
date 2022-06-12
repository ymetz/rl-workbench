import React from 'react';
import { Circle } from '@visx/shape';
import styled from 'styled-components';

const StyledCircle = styled(Circle)`
    stroke: gray;
    fill: darkgray;
`;

interface Props {
    x: number;
    y: number;
    value: number;
}

const DataPointComponent: React.FunctionComponent<Props> = ({ x, y, value }: Props) => {
    return <StyledCircle cx={x} cy={y} r={value} />;
};

export default DataPointComponent;
