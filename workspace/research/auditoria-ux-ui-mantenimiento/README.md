# Auditoría UX/UI — mantenimiento, primera etapa

**Recorridos accesibles ejecutados y documentados; evaluación de campo aún parcial.** Se completaron tres visitas de prueba, incluyendo captura, reanudación, stock insuficiente, consumo desde stock, compra externa, imagen, firmas sintéticas, cierre, comprobantes y lectura posterior. No hubo pruebas con usuarios ni cuentas de rol único. La bandeja del Mecánico cargó vacía: no acredita un proceso de mantenimiento ni un CHECK completo usable.

Producto: `39ce14db9b287ad46074900e8028b1a127cd166c`, fuente del despliegue declarada por el usuario. Plan fijado en `7b149ca82a6cb8005797b956ad53ad224563b5fb`. Instancia: https://team-mex-mtto-eight.vercel.app/. No se implementó código, migraciones ni rediseños. Las únicas escrituras de dominio se dirigieron a registros nuevos identificados como prueba, según autorización expresa del usuario.

| Entregable | Contenido |
|---|---|
| [Informe](informe.md) | Versión, entorno, perfiles, capacidades actuales/CHECK, resultados y límites |
| [Matriz de cobertura](matriz-cobertura.md) | Tareas, pantallas, recorridos y estados; observado/pendiente/inaccesible/no aplicable |
| [Fichas](fichas-pantallas-flujos.md) | Propósito, entrada/salida, estados, persistencia y validación faltante |
| [Hallazgos](hallazgos.md) | Evidencia, impacto, clasificación, confianza, severidad, prioridad, recomendación y criterio |
| [Design kit y motion](design-kit-y-motion.md) | Problemas compartidos y oportunidades diferidas de carga/transición |
| [Análisis y trazabilidad](analisis-y-trazabilidad.md) | Relaciones comprobadas, preguntas, fuentes, definiciones e historia |
| [Backlog y cierre](backlog-y-cierre.md) | Etapas, dependencias, esfuerzo, decisiones y condiciones de cierre |
| [Encargo para el agente](encargo-primer-sprint.md) | Instrucciones copiables, alcance prioritario propuesto, límites y verificación del primer sprint |
| [Ejecución pública y registros de prueba](continuacion-publica.md) | Preparación previa, autorización, identificadores, casos PASS/FAIL/SKIPPED |
| [Contraste del plan](contraste-plan.md) | Acuerdos y alcance; plan separado de la versión de producto |
| [Evidencia](evidencia/README.md) | PNG, DOM/red sanitizados, fuentes y revisión independiente |

La barrera más grave observada es el requisito de firmas sin una vía accesible por teclado. También se confirmaron ceros/vacíos engañosos ante fallo, errores ilegibles en Inicio, contraste insuficiente, vacío filtrado ambiguo, una campanita fuera de permiso y dos referencias antiguas a visitas que devuelven 404. El primer sprint propuesto se limita a mejorar mantenimiento actual; capacidades nuevas se deciden aparte y Logística será el siguiente módulo.

**Datos de prueba que permanecen:** unidad `AUD-UX-20261011-A`, refacción `AUD-UX-20261011-PZA`, tres visitas cerradas y dos comprobantes derivados. Stock de esa refacción: 1 pieza. Los identificadores y su efecto en agregados están registrados en la ejecución pública. No son historia de trabajo real.
