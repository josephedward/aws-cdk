import * as ecs from '@aws-cdk/aws-ecs';
import { Construct } from 'constructs';
import { Service } from '../service';
import { ServiceExtension } from './extension-interfaces';
/**
 * This extension adds an X-Ray daemon inside the task definition for
 * capturing application trace spans and submitting them to the AWS
 * X-Ray service.
 */
export declare class XRayExtension extends ServiceExtension {
    constructor();
    prehook(service: Service, scope: Construct): void;
    useTaskDefinition(taskDefinition: ecs.TaskDefinition): void;
    resolveContainerDependencies(): void;
}
