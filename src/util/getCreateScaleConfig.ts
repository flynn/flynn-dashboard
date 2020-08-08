import { ScaleConfig, CreateScaleRequest } from '../generated/controller_pb';

export default function getCreateScaleConfig(req: CreateScaleRequest): ScaleConfig {
	let config = req.getConfig();
	if (!config) {
		config = new ScaleConfig();
		req.setConfig(config);
	}
	return config;
}
