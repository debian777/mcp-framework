#!/usr/bin/env node

import { startJsonRpcServer } from './server.js';
import { registerHealth } from './health.js';

const handlers = {};
registerHealth(handlers);

startJsonRpcServer(handlers);