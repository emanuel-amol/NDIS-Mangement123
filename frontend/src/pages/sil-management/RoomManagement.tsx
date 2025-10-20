// frontend/src/pages/sil-management/RoomManagement.tsx
import React, { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import {
  silService,
  HomeDetailResponse,
  RoomPayload,
  OccupancyPayload,
} from "../../services/silService";

const bedTypes = ["Single", "Double", "Queen", "King"];
const rentFrequencies = ["Weekly", "Fortnightly", "Monthly"];

const emptyRoomForm = {
  name: "",
  bedType: "",
  rentAmount: "",
  rentFrequency: "Weekly",
  ensuite: false,
  furnishings: "",
  occupancyStatus: "Vacant",
  bedHeight: "",
  sofas: "0",
  cupboard: false,
  tv: false,
  tables: "0",
  doorWidth: "",
  description: "",
};

const emptyOccupancyForm = {
  participantId: "",
  moveInDate: "",
  moveOutDate: "",
};

const RoomManagement: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showAddRoom, setShowAddRoom] = useState(false);
  const [roomForm, setRoomForm] = useState(emptyRoomForm);
  const [occupancyForms, setOccupancyForms] = useState<
    Record<number, typeof emptyOccupancyForm>
  >({});

  const homeQuery = useQuery<HomeDetailResponse, Error>({
    queryKey: ["sil", "homes", id],
    queryFn: () => silService.getHome(id ?? ""),
    enabled: Boolean(id),
  });

  const createRoomMutation = useMutation({
    mutationFn: (payload: RoomPayload) =>
      silService.createRoom(id ?? "", payload),
    onSuccess: () => {
      toast.success("Room added");
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id] });
      setRoomForm(emptyRoomForm);
      setShowAddRoom(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const assignOccupancyMutation = useMutation({
    mutationFn: ({
      roomId,
      payload,
    }: {
      roomId: number;
      payload: OccupancyPayload;
    }) => silService.assignOccupancy(roomId, payload),
    onSuccess: (_, variables) => {
      toast.success("Occupancy saved");
      queryClient.invalidateQueries({ queryKey: ["sil", "homes", id] });
      setOccupancyForms((prev) => ({
        ...prev,
        [variables.roomId]: emptyOccupancyForm,
      }));
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const handleCreateRoom = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!roomForm.name.trim()) {
      toast.error("Please provide a room name");
      return;
    }
    if (!roomForm.bedType) {
      toast.error("Please pick a bed type");
      return;
    }
    const rentAmount = parseFloat(roomForm.rentAmount);
    if (Number.isNaN(rentAmount) || rentAmount <= 0) {
      toast.error("Please provide a valid rent amount");
      return;
    }

    const payload: RoomPayload = {
      bedType: roomForm.bedType,
      rentAmount,
      rentFrequency: roomForm.rentFrequency,
      ensuite: roomForm.ensuite,
      furnishings: roomForm.furnishings || undefined,
      occupancyStatus: roomForm.occupancyStatus,
      detail: {
        name: roomForm.name,
        bedHeight: roomForm.bedHeight || undefined,
        sofas: Number(roomForm.sofas) || 0,
        cupboard: roomForm.cupboard,
        tv: roomForm.tv,
        tables: Number(roomForm.tables) || 0,
        doorWidth: roomForm.doorWidth || undefined,
        description: roomForm.description || undefined,
      },
    };

    createRoomMutation.mutate(payload);
  };

  const handleOccupancyChange = (
    roomId: number,
    field: keyof typeof emptyOccupancyForm,
    value: string,
  ) => {
    setOccupancyForms((prev) => ({
      ...prev,
      [roomId]: {
        ...prev[roomId],
        [field]: value,
      },
    }));
  };

  const handleAssignOccupancy = (
    event: React.FormEvent<HTMLFormElement>,
    roomId: number,
  ) => {
    event.preventDefault();
    const form = occupancyForms[roomId] ?? emptyOccupancyForm;

    if (!form.participantId || !form.moveInDate) {
      toast.error("Participant ID and move-in date are required");
      return;
    }

    assignOccupancyMutation.mutate({
      roomId,
      payload: {
        participantId: Number(form.participantId),
        moveInDate: form.moveInDate,
        moveOutDate: form.moveOutDate || undefined,
      },
    });
  };

  if (homeQuery.isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          <p className="mt-4 text-gray-600">Loading rooms...</p>
        </div>
      </div>
    );
  }

  if (homeQuery.isError || !homeQuery.data) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Unable to load rooms
          </h2>
          <p className="text-gray-600 mb-4">
            {homeQuery.error?.message ?? "Please try again later."}
          </p>
          <Link
            to={`/sil/homes/${id}`}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  const home = homeQuery.data;
  const rooms = home.rooms;
  const occupancyData = useMemo(() => occupancyForms, [occupancyForms]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <nav className="flex items-center space-x-2 text-sm text-gray-500 mb-2">
                <Link to="/sil" className="hover:text-blue-600">
                  SIL Management
                </Link>
                <span>&gt;</span>
                <Link to="/sil/homes" className="hover:text-blue-600">
                  Homes
                </Link>
                <span>&gt;</span>
                <Link
                  to={`/sil/homes/${home.id}`}
                  className="hover:text-blue-600"
                >
                  {home.profile?.displayName ?? home.address}
                </Link>
                <span>&gt;</span>
                <span className="text-gray-900">Rooms</span>
              </nav>
              <h1 className="text-2xl font-bold text-gray-900">
                Room Management
              </h1>
              <p className="mt-2 text-gray-600">
                Manage rooms, occupancy, and amenities for this home.
              </p>
            </div>
            <button
              onClick={() => setShowAddRoom((prev) => !prev)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              {showAddRoom ? "Close" : "Add Room"}
            </button>
          </div>

          {showAddRoom && (
            <div className="bg-white shadow rounded-lg p-6 mb-8">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Add New Room
              </h2>
              <form className="space-y-4" onSubmit={handleCreateRoom}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room Name *
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.name}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bed Type *
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.bedType}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          bedType: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select bed type</option>
                      {bedTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rent Amount *
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.rentAmount}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          rentAmount: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rent Frequency
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.rentFrequency}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          rentFrequency: e.target.value,
                        }))
                      }
                    >
                      {rentFrequencies.map((frequency) => (
                        <option key={frequency} value={frequency}>
                          {frequency}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Bed Height
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.bedHeight}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          bedHeight: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Door Width
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.doorWidth}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          doorWidth: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Sofas
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.sofas}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          sofas: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tables
                    </label>
                    <input
                      type="number"
                      min="0"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      value={roomForm.tables}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          tables: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={roomForm.ensuite}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          ensuite: e.target.checked,
                        }))
                      }
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Ensuite bathroom
                    </span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={roomForm.cupboard}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          cupboard: e.target.checked,
                        }))
                      }
                    />
                    <span className="ml-2 text-sm text-gray-700">Cupboard</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      checked={roomForm.tv}
                      onChange={(e) =>
                        setRoomForm((prev) => ({
                          ...prev,
                          tv: e.target.checked,
                        }))
                      }
                    />
                    <span className="ml-2 text-sm text-gray-700">
                      Television
                    </span>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Furnishings
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={roomForm.furnishings}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        furnishings: e.target.value,
                      }))
                    }
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    value={roomForm.description}
                    onChange={(e) =>
                      setRoomForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowAddRoom(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createRoomMutation.isPending}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                  >
                    {createRoomMutation.isPending ? "Saving..." : "Add Room"}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {rooms.length === 0 ? (
              <div className="text-center py-12 bg-white border border-dashed border-gray-300 rounded-lg text-gray-600">
                No rooms have been added yet.
              </div>
            ) : (
              rooms.map((room) => {
                const form = occupancyData[room.id] ?? emptyOccupancyForm;
                return (
                  <div key={room.id} className="bg-white shadow rounded-lg p-6">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                          {room.detail?.name ?? `Room ${room.id}`}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Bed type: {room.bedType}
                        </p>
                        <p className="text-sm text-gray-600">
                          Rent: ${room.rentAmount} / {room.rentFrequency}
                        </p>
                        <p className="text-sm text-gray-600">
                          Status: {room.occupancyStatus ?? "Vacant"}
                        </p>
                      </div>
                      <div className="text-sm text-gray-600">
                        <p>Ensuite: {room.ensuite ? "Yes" : "No"}</p>
                        <p>Furnishings: {room.furnishings ?? "-"}</p>
                        <p>Door width: {room.detail?.doorWidth ?? "-"}</p>
                      </div>
                    </div>

                    {room.detail?.description && (
                      <p className="mt-3 text-sm text-gray-600">
                        {room.detail.description}
                      </p>
                    )}

                    {room.occupancies.length > 0 && (
                      <div className="mt-4">
                        <h4 className="text-sm font-semibold text-gray-700 mb-2">
                          Occupancy History
                        </h4>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {room.occupancies.map((occ) => (
                            <li key={occ.id}>
                              {occ.participant
                                ? `${occ.participant.firstName ?? ""} ${occ.participant.lastName ?? ""}`.trim()
                                : `Participant #${occ.participantId}`}
                              : {occ.moveInDate} ?{" "}
                              {occ.moveOutDate ?? "Current"}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="mt-4">
                      <h4 className="text-sm font-semibold text-gray-700 mb-2">
                        Assign Participant
                      </h4>
                      <form
                        className="grid grid-cols-1 md:grid-cols-4 gap-3"
                        onSubmit={(event) =>
                          handleAssignOccupancy(event, room.id)
                        }
                      >
                        <input
                          type="number"
                          min="1"
                          placeholder="Participant ID"
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={form.participantId}
                          onChange={(e) =>
                            handleOccupancyChange(
                              room.id,
                              "participantId",
                              e.target.value,
                            )
                          }
                        />
                        <input
                          type="date"
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={form.moveInDate}
                          onChange={(e) =>
                            handleOccupancyChange(
                              room.id,
                              "moveInDate",
                              e.target.value,
                            )
                          }
                        />
                        <input
                          type="date"
                          className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                          value={form.moveOutDate}
                          onChange={(e) =>
                            handleOccupancyChange(
                              room.id,
                              "moveOutDate",
                              e.target.value,
                            )
                          }
                        />
                        <button
                          type="submit"
                          disabled={assignOccupancyMutation.isPending}
                          className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-60"
                        >
                          {assignOccupancyMutation.isPending
                            ? "Saving..."
                            : "Assign"}
                        </button>
                      </form>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoomManagement;
