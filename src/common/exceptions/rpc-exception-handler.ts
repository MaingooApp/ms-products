import { RpcException } from '@nestjs/microservices';

export class RpcExceptionHandler {
  static handle(error: any): never {
    if (error instanceof RpcException) {
      throw error;
    }

    if (error.code === 'P2002') {
      throw new RpcException({
        status: 409,
        message: `Duplicate entry for ${error.meta?.target || 'field'}`,
      });
    }

    if (error.code === 'P2025') {
      throw new RpcException({
        status: 404,
        message: 'Record not found',
      });
    }

    throw new RpcException({
      status: 500,
      message: error.message || 'Internal server error',
    });
  }
}
