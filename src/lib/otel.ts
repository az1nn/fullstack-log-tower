import { NodeSDK } from '@opentelemetry/sdk-node'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions'
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http'
import { ConsoleSpanExporter, BatchSpanProcessor } from '@opentelemetry/sdk-trace-node'
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node'
import { FastifyOtelInstrumentation } from '@fastify/otel'

let sdk: NodeSDK | undefined

export async function startTracing(): Promise<void> {
  if (sdk) return

  const exporter = process.env.OTEL_EXPORTER_OTLP_ENDPOINT
    ? new OTLPTraceExporter({
        url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT.endsWith('/v1/traces')
          ? process.env.OTEL_EXPORTER_OTLP_ENDPOINT
          : `${process.env.OTEL_EXPORTER_OTLP_ENDPOINT.replace(/\/$/, '')}/v1/traces`,
      })
    : new ConsoleSpanExporter()

  const resource = resourceFromAttributes({
    [ATTR_SERVICE_NAME]: 'fullstack-log-tower-api',
    [ATTR_SERVICE_VERSION]: process.env.npm_package_version ?? '1.0.0',
    'deployment.environment': process.env.NODE_ENV || 'production',
  })

  sdk = new NodeSDK({
    resource,
    spanProcessor: new BatchSpanProcessor(exporter),
    instrumentations: [
      getNodeAutoInstrumentations(),
      new FastifyOtelInstrumentation({ registerOnInitialization: true }),
    ],
  })

  sdk.start()
  console.log(`OpenTelemetry started (exporter: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT ? 'otlp' : 'console'})`)
}
