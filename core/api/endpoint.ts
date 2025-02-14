export type Endpoint<Request, Response> = {
  id: string;
};

export type RequestOf<E> = E extends Endpoint<infer Request, any>
  ? Request
  : never;
export type ResponseOf<E> = E extends Endpoint<any, infer Response>
  ? Response
  : never;

export type WrappedResponse<Response> =
  | {
      kind: "success";
      response: Response;
    }
  | {
      kind: "error";
      message: string;
    };

export function declareEndpoint<Request, Response>(
  id: string
): Endpoint<Request, Response> {
  return { id };
}
