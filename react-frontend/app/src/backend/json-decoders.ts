import { JsonDecoder } from 'ts.data.json';
import { DataPoint } from 'types/DataPoint';

/* **********
 * number[] *
 ********** */
const dataPointDecoder = JsonDecoder.object<DataPoint>(
    {
        x: JsonDecoder.number,
        y: JsonDecoder.number,
        value: JsonDecoder.number,
    },
    'DataPoint'
);

/* ***********
 * DataArray *
 *********** */
export const dataArrayDecoder = JsonDecoder.array<DataPoint>(dataPointDecoder, 'DataArray');
