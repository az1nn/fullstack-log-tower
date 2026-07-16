import { WebTracerProvider, BatchSpanProcessor } from '@opentelemetry/sdk-trace-web';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ZoneContextManager } from '@opentelemetry/context-zone';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace, context, propagation, SpanStatusCode } from '@opentelemetry/api';

let initialized = false;

export function initTracing(): void {
  if (initialized) return;
  initialized = true;

  const endpoint = import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT as string | undefined;

  const providerOptions: ConstructorParameters<typeof WebTracerProvider>[0] = {
    resource: resourceFromAttributes({
      [ATTR_SERVICE_NAME]: 'fullstack-log-tower-web',
    }),
  };

  if (endpoint) {
    const url = endpoint.endsWith('/v1/traces') ? endpoint : `${endpoint}/v1/traces`;
    const exporter = new OTLPTraceExporter({ url });
    providerOptions.spanProcessors = [new BatchSpanProcessor(exporter)];
  }

  const provider = new WebTracerProvider(providerOptions);

  provider.register({
    contextManager: new ZoneContextManager(),
    propagator: new W3CTraceContextPropagator(),
  });
}

export function getTracer() {
  return trace.getTracer('fullstack-log-tower-web');
}

export function isTracingEnabled(): boolean {
  return Boolean(import.meta.env.VITE_OTEL_EXPORTER_OTLP_ENDPOINT);
}

export function recordException(error: unknown): void {
  if (!isTracingEnabled()) return;
  const span = getTracer().startSpan('frontend-error');
  span.recordException(error instanceof Error ? error : new Error(String(error)));
  span.setStatus({ code: SpanStatusCode.ERROR });
  span.end();
}

export { context, propagation };
