import React, { useEffect, useState } from "react";
import { useQueryClient, useMutation } from "react-query";
import * as Sentry from "@sentry/react";
import {
  User,
  Users,
  OrganisationName,
  NewUserValues,
  UserRole,
} from "./types";
import Organisation from "./components/Organisation";
import AddNewUser from "./components/AddNewUser/AddNewUser";
import TableView from "./components/TableView/TableView";
import DeleteConfirmationModal from "./components/DeleteConfirmationModal/DeleteConfirmationModal";
import UserSearch from "./components/UserSearch/UserSearch";

import { requestAddUser, requestUpdateUser } from "./api";
import { getErrorMessage, errorMessages } from "./utils";

export type AccountUsersProps = {
  organisationName: OrganisationName;
  accountId: string;
  users: Users;
};

const AccountUsers = ({
  accountId,
  organisationName,
  users,
}: AccountUsersProps) => {
  const [notification, setNotification] = useState<{
    severity: string;
    message: string;
  } | null>(null);

  const queryClient = useQueryClient();

  const userAddMutation = useMutation(
    (user: NewUserValues) => requestAddUser({ accountId, ...user }),
    { onSuccess: () => queryClient.invalidateQueries("accountUsers") }
  );

  const userUpdateMutation = useMutation(
    ({ email, role }: { email: string; role: UserRole }) =>
      requestUpdateUser({
        accountId,
        email,
        role,
      }),
    {
      onSuccess: () => queryClient.invalidateQueries("accountUsers"),
    }
  );

  const handleMutationError = (error: unknown) => {
    const errorMessage = getErrorMessage(error);
    if (errorMessage === errorMessages.unknown) {
      Sentry.captureException(error);
    }

    setNotification({
      severity: "negative",
      message: errorMessage,
    });
  };

  const handleUpdateUser = ({
    email,
    newUserRole,
  }: {
    email: string;
    newUserRole: UserRole;
  }): Promise<any> =>
    userUpdateMutation
      .mutateAsync({ email, role: newUserRole })
      .then(() => {
        dismissEditMode();
        setNotification({ severity: "positive", message: "User updated" });
      })
      .catch(handleMutationError);

  const handleAddNewUser = (user: NewUserValues) =>
    userAddMutation
      .mutateAsync(user)
      .then(() => {
        setNotification({
          severity: "positive",
          message: "User added successfully",
        });
      })
      .catch(handleMutationError);

  const [
    isDeleteConfirmationModalOpen,
    setIsDeleteConfirmationModalOpen,
  ] = useState(false);

  const [userInEditModeById, setUserInEditModeById] = useState<string | null>(
    null
  );

  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);

  const userInEditMode: User | undefined = React.useMemo(
    () =>
      typeof userInEditModeById === "string"
        ? filteredUsers.find((user) => user.email === userInEditModeById)
        : undefined,
    [userInEditModeById, filteredUsers]
  );

  const [searchQuery, setSearchQuery] = useState("");

  const dismissEditMode = () => setUserInEditModeById(null);
  const handleDeleteConfirmationModalClose = () => {
    setIsDeleteConfirmationModalOpen(false);
  };
  const handleDeleteConfirmationModalOpen = () =>
    setIsDeleteConfirmationModalOpen(true);

  const handleOnAfterDeleteSuccess = () => {
    dismissEditMode();
    setNotification({ severity: "positive", message: "User deleted" });
  };

  const handleSearch = (value: string) => {
    dismissEditMode();
    setSearchQuery(value);
  };

  useEffect(() => {
    const filteredUsers = users.filter((user) =>
      user.email.includes(searchQuery)
    );

    setFilteredUsers(filteredUsers);
  }, [searchQuery, users]);

  return (
    <div>
      <section className="p-strip u-no-padding--top">
        <div className="row">
          <div className="col-6">
            <Organisation name={organisationName} />
          </div>
        </div>
        <div className="row">
          <div className="col-6">
            <AddNewUser
              handleSubmit={handleAddNewUser}
              onAfterModalOpen={() => setNotification(null)}
            />
          </div>
          <div className="col-6">
            <UserSearch handleSearch={handleSearch} />
          </div>
        </div>
        {notification ? (
          <div className="row">
            <div className="col-12">
              <div className={`p-notification--${notification.severity}`}>
                <div className="p-notification__content" aria-atomic="true">
                  <h5 className="p-notification__title">
                    {notification.severity === "positive" ? "Success" : "Error"}
                  </h5>
                  <p className="p-notification__message" role="alert">
                    {notification.message}
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : null}
        {isDeleteConfirmationModalOpen && userInEditMode ? (
          <DeleteConfirmationModal
            accountId={accountId}
            user={userInEditMode}
            onAfterDeleteSuccess={handleOnAfterDeleteSuccess}
            handleClose={handleDeleteConfirmationModalClose}
          />
        ) : null}
        <div className="row">
          <div className="col-12">
            <TableView
              users={filteredUsers}
              userInEditMode={userInEditMode}
              setUserInEditModeById={setUserInEditModeById}
              dismissEditMode={dismissEditMode}
              handleEditSubmit={handleUpdateUser}
              handleDeleteConfirmationModalOpen={
                handleDeleteConfirmationModalOpen
              }
            />
          </div>
        </div>
      </section>
    </div>
  );
};

export default AccountUsers;
