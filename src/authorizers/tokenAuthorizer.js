exports.handler = async (event) => {
    const token = event.headers.Authorization || event.headers.authorization;
    if(token !== "Bearer mysecrettoken"){
        return generatePolicy('user', 'Deny', event.routeArn, {
            'poweredBy': 'Artisthub',
            'reason': 'Invalid token'
        }) ;
    }
    return generatePolicy('user', 'Allow', event.routeArn, {
        'poweredBy': 'Artisthub'
    }) ;
}

const generatePolicy = (principalId, effect, resource, context) => {
    const authResponse = {
        principalId,
        policyDocument: {
            Version: '2012-10-17',
            Statement: [
                {
                    Action: 'execute-api:Invoke',
                    Effect: effect,
                    Resource: resource,
                },
            ],
        },
        context,
    };
    return authResponse;
}