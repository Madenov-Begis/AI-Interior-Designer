import {
  GenerationReservationError,
  type RefinementReservationInput,
  type RootGenerationReservationInput,
} from "./operations.ts";
import {
  refinementReservationHttpStatus,
  retryReservationHttpStatus,
  rootReservationHttpStatus,
} from "./reservation-policy.ts";

type ReservationResult = {
  generation: {
    id: string;
    status: string;
  };
  isExisting: boolean;
};

type ReservationDependencies<TInput> = {
  reserve(input: TInput): Promise<ReservationResult>;
  schedule(generationId: string): void;
};

function jsonResponse(
  body: unknown,
  requestId: string,
  init?: ResponseInit,
) {
  const response = Response.json(body, init);
  response.headers.set("x-request-id", requestId);
  return response;
}

function reservationErrorResponse(
  error: GenerationReservationError,
  requestId: string,
  status: number,
) {
  return jsonResponse(
    {
      error: { code: error.code, message: error.message },
      meta: { requestId },
    },
    requestId,
    { status },
  );
}

function scheduleNewGeneration(
  result: ReservationResult,
  schedule: (generationId: string) => void,
) {
  if (!result.isExisting && result.generation.status === "QUEUED") {
    schedule(result.generation.id);
  }
}

export async function handleRootGenerationReservation(
  input: RootGenerationReservationInput,
  requestId: string,
  dependencies: ReservationDependencies<RootGenerationReservationInput>,
) {
  try {
    const reserved = await dependencies.reserve(input);
    scheduleNewGeneration(reserved, dependencies.schedule);
    return jsonResponse(
      {
        data: {
          id: reserved.generation.id,
          status: reserved.generation.status,
          isExisting: reserved.isExisting,
        },
        meta: { requestId },
      },
      requestId,
      { status: reserved.isExisting ? 200 : 202 },
    );
  } catch (error) {
    if (error instanceof GenerationReservationError) {
      return reservationErrorResponse(
        error,
        requestId,
        rootReservationHttpStatus(error.code),
      );
    }
    throw error;
  }
}

export async function handleRefinementGenerationReservation(
  input: RefinementReservationInput,
  requestId: string,
  dependencies: ReservationDependencies<RefinementReservationInput>,
) {
  try {
    const reserved = await dependencies.reserve(input);
    scheduleNewGeneration(reserved, dependencies.schedule);
    return jsonResponse(
      {
        data: {
          id: reserved.generation.id,
          parentGenerationId: input.parentGenerationId,
          status: reserved.generation.status,
          isExisting: reserved.isExisting,
        },
        meta: { requestId },
      },
      requestId,
      { status: reserved.isExisting ? 200 : 202 },
    );
  } catch (error) {
    if (error instanceof GenerationReservationError) {
      return reservationErrorResponse(
        error,
        requestId,
        refinementReservationHttpStatus(error.code),
      );
    }
    throw error;
  }
}

export async function handleRetryGenerationReservation(
  input: RootGenerationReservationInput,
  retriedFromId: string,
  requestId: string,
  dependencies: ReservationDependencies<RootGenerationReservationInput>,
) {
  try {
    const reserved = await dependencies.reserve(input);
    scheduleNewGeneration(reserved, dependencies.schedule);
    return jsonResponse(
      {
        data: {
          id: reserved.generation.id,
          retriedFromId,
          status: reserved.generation.status,
          isExisting: reserved.isExisting,
        },
        meta: { requestId },
      },
      requestId,
      { status: reserved.isExisting ? 200 : 202 },
    );
  } catch (error) {
    if (error instanceof GenerationReservationError) {
      return reservationErrorResponse(
        error,
        requestId,
        retryReservationHttpStatus(error.code),
      );
    }
    throw error;
  }
}
