import { ScaleConfig, CreateScaleRequest } from '../generated/controller_pb';

export default function getCreateScaleConfig(req: CreateScaleRequest): ScaleConfig {
	const config = req.getConfig();
	if (config) {
		return config;
	}
	return new ScaleConfig();
}
