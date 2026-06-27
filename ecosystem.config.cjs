// 🐴 PM2 config for VPS deployment
module.exports = {
	apps: [{
		name: 'memfinance',
		script: 'build/index.js',
		env: {
			PORT: 3000,
			NODE_ENV: 'production'
		},
		env_file: '.env',
		watch: false,
		instances: 1,
		exec_mode: 'fork',
		max_memory_restart: '500M',
		error_file: 'logs/err.log',
		out_file: 'logs/out.log',
		merge_logs: true,
		log_date_format: 'YYYY-MM-DD HH:mm:ss'
	}]
};
