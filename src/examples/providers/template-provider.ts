import { ResourceProvider, ResourceProviderConfig } from '../../framework/providers/abstract/resource-provider.js';

export class TemplateProvider extends ResourceProvider {
    constructor(config: ResourceProviderConfig) {
        super({ name: config.name, description: config.description });
    }

    protected getResourceTemplatesImpl() {
        return [
            {
                uriTemplate: 'file://{path}',
                name: this.name,
                description: 'Template provider for local files'
            }
        ];
    }

    async readResource(uri: string, params?: Record<string, any>) {
        const path = params?.path || '';
        // return dummy content
        return {
            contents: [
                {
                    uri,
                    text: `content-of:${path}`,
                    mimeType: 'text/plain'
                }
            ]
        };
    }
}

export default TemplateProvider;
