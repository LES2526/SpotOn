'use client';

import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';

type Props = {
    spec: object,
};

function ReactSwagger({ spec }: Readonly<Props>) {
    return (
        <SwaggerUI
            spec={spec}
            requestInterceptor={(req: Record<string, unknown>) => {
                req.credentials = 'include';
                return req;
            }}
        />
    );
}

export default ReactSwagger;